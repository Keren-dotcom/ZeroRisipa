from datetime import date
from decimal import Decimal
import logging

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models import Ingredient, PantryItem, Recipe, RecipeIngredient,RecipeSuggestion, User

logger = logging.getLogger(__name__)


# --- Scheme Pydantic pentru Structured Output de la Gemini ---
class GeneratedIngredientSchema(BaseModel):
    name: str = Field(description="Numele ingredientului cu litere mici, la singular/forma de bază (ex: 'egg', 'milk', 'tomato')")
    quantity: float = Field(description="Cantitatea necesară în rețetă (număr pozitiv, strict mai mare decât 0)")
    unit: str = Field(description="Unitatea de măsură (ex: 'g', 'ml', 'pcs', 'tbsp')")


class GeneratedRecipeSchema(BaseModel):
    name: str = Field(description="Titlul rețetei (maxim 140 caractere)")
    description: str = Field(description="O descriere scurtă (1-2 propoziții) despre rețetă și ce ingrediente salvăm de la expirare")
    servings: int = Field(description="Numărul de porții (între 1 și 12)")
    prep_time_minutes: int = Field(description="Timpul de pregătire la rece: spălat, tocat, amestecat, în minute (>= 0)")
    cook_time_minutes: int = Field(description="Timpul efectiv de gătire termică: prăjit, fiert, copt, în minute (0 dacă nu necesită gătire)")
    ingredients: list[GeneratedIngredientSchema]
    steps: list[str] = Field(description="Lista pașilor de preparare, în ordine")


class GeneratedRecipesListSchema(BaseModel):
    recipes: list[GeneratedRecipeSchema] = Field(description="Listă cu 6 rețete generate")


# --- Funcții ajutătoare pentru baza de date ---
def _get_or_create_ingredient(
    db: Session, user_id: int, raw_name: str, default_unit: str
) -> Ingredient:
    """Caută ingredientul în catalogul comun sau în cel al userului; dacă nu există, îl creează."""
    clean_name = raw_name.strip().lower()[:100]
    clean_unit = (default_unit.strip() or "pcs")[:20]

    # 1. Căutăm mai întâi în catalogul comun (owner_id IS NULL)
    shared = db.scalar(
        select(Ingredient).where(
            Ingredient.owner_id.is_(None),
            Ingredient.name == clean_name,
        )
    )
    if shared is not None:
        return shared

    # 2. Căutăm în ingredientele proprii ale utilizatorului
    personal = db.scalar(
        select(Ingredient).where(
            Ingredient.owner_id == user_id,
            Ingredient.name == clean_name,
        )
    )
    if personal is not None:
        return personal

    # 3. Dacă nu există deloc (ex. un ingredient lipsă sugerat de AI), îl creăm pentru user
    new_ing = Ingredient(
        name=clean_name,
        category="ai-suggested",
        default_unit=clean_unit,
        owner_id=user_id,
    )
    db.add(new_ing)
    db.flush()  # obținem new_ing.id fără a face încă commit final
    return new_ing


def _get_unique_recipe_name(db: Session, base_name: str) -> str:
    """Asigură unicitatea numelui rețetei în tabela `recipes` (unde `name` este UNIQUE)."""
    clean_name = base_name.strip()[:140]
    candidate = clean_name
    counter = 2
    while db.scalar(select(Recipe.id).where(Recipe.name == candidate)) is not None:
        suffix = f" ({counter})"
        candidate = f"{clean_name[: 150 - len(suffix)]}{suffix}"
        counter += 1
    return candidate


# --- Funcția principală apelată din router ---
def generate_zero_waste_recipes(db: Session, user: User) -> list[Recipe]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    # 1. Luăm ingredientele din cămara utilizatorului, sortate după data expirării (cele mai urgente primele)
    pantry_items = db.scalars(
        select(PantryItem)
        .where(PantryItem.user_id == user.id)
        .options(joinedload(PantryItem.ingredient))
        .order_by(PantryItem.expiry_date.asc())
    ).all()

    # Dacă userul are cămara goală, returnăm rețetele predefinite din DB ca fallback
    if not pantry_items:
        return list(db.scalars(select(Recipe).order_by(Recipe.name, Recipe.id).limit(3)).all())

    today = date.today()
    pantry_lines = []
    for item in pantry_items:
        days_left = (item.expiry_date - today).days
        if days_left < 0:
            urgency = f"EXPIRED {-days_left} days ago"
        elif days_left == 0:
            urgency = "EXPIRES TODAY"
        elif days_left == 1:
            urgency = "expires tomorrow"
        else:
            urgency = f"expires in {days_left} days"

        pantry_lines.append(
            f"- {item.ingredient.name}: {item.quantity} {item.unit} ({urgency})"
        )

    pantry_summary = "\n".join(pantry_lines)

    # Luăm numele rețetelor deja existente ale userului ca AI-ul să nu le repete
    existing_names = list(
        db.scalars(
            select(Recipe.name)
            .join(RecipeSuggestion, RecipeSuggestion.recipe_id == Recipe.id)
            .where(RecipeSuggestion.user_id == user.id)
        ).all()
    )
    avoid_clause = ""
    if existing_names:
        avoid_clause = (
            "\n5. Do NOT repeat or slightly rename any of these already generated recipes: "
            + ", ".join(existing_names[:15])
            + "."
        )

    prompt = f"""
You are a smart zero-waste culinary assistant for a student pantry app.
Here are the ingredients currently in the user's pantry, sorted by expiration urgency:
{pantry_summary}

Task:
1. Generate 6 distinct, practical, delicious recipes that MAXIMIZE the use of ingredients expiring soonest (especially items expiring today, tomorrow, or in the next 3 days).
2. Keep the ingredient names simple, lowercase, and matching the pantry names whenever used (e.g., use exact names like '{pantry_items[0].ingredient.name}'), using compatible units (g, ml, pcs, tbsp, tsp) so the frontend can match quantities accurately.
3. If a recipe needs 1 or 2 common missing ingredients (like salt, olive oil, garlic, or a missing vegetable) to make the dish complete, include them in the ingredients list as well.
4. Write clear, step-by-step instructions in English.{avoid_clause}
"""

    FALLBACK_MODELS = [
        "gemini-flash-lite-latest",
        "gemini-2.5-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash-lite",
        "gemini-3.7-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
    ]

    # IMPORTANT: timeout în HttpOptions este în MILISECUNDE (15000 ms = 15 secunde)
    client = genai.Client(
        api_key=settings.gemini_api_key,
        http_options=types.HttpOptions(api_version="v1beta", timeout=15_000),
    )

    parsed: GeneratedRecipesListSchema | None = None
    last_error: Exception | None = None

    for model_name in FALLBACK_MODELS:
        try:
            logger.info("Trying Gemini model: %s", model_name)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeneratedRecipesListSchema,
                    temperature=0.4,
                ),
            )
            parsed = GeneratedRecipesListSchema.model_validate_json(response.text)
            logger.info("Successfully generated recipes using model: %s", model_name)
            break
        except Exception as e:
            last_error = e
            logger.warning("Model %s failed (%s), trying next fallback...", model_name, e)
            continue

    if parsed is None:
        logger.error("All Gemini fallback models failed.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not generate recipes with AI after trying all models: {str(last_error)}",
        )

    # 2. Salvăm rețetele generate în PostgreSQL ca rânduri în `recipes` și `recipe_ingredients`
    created_recipes: list[Recipe] = []

    for gen_recipe in parsed.recipes:
        unique_name = _get_unique_recipe_name(db, gen_recipe.name)
        instructions_text = "\n".join(
            step.strip() for step in gen_recipe.steps if step.strip()
        )

        db_recipe = Recipe(
            name=unique_name,
            description=gen_recipe.description.strip(),
            instructions=instructions_text or "Follow standard preparation steps.",
            servings=max(1, gen_recipe.servings),
            prep_time_minutes=max(0, gen_recipe.prep_time_minutes),
            cook_time_minutes=max(0, gen_recipe.cook_time_minutes),
        )
        db.add(db_recipe)
        db.flush()  # obținem db_recipe.id

        # Evităm duplicatele de ingredient în aceeași rețetă (cheie primară compusă recipe_id + ingredient_id)
        seen_ingredient_ids: set[int] = set()
        for gen_ing in gen_recipe.ingredients:
            ing_obj = _get_or_create_ingredient(
                db=db,
                user_id=user.id,
                raw_name=gen_ing.name,
                default_unit=gen_ing.unit,
            )
            if ing_obj.id in seen_ingredient_ids:
                continue
            seen_ingredient_ids.add(ing_obj.id)

            qty = Decimal(str(round(max(0.01, gen_ing.quantity), 2)))
            link = RecipeIngredient(
                recipe_id=db_recipe.id,
                ingredient_id=ing_obj.id,
                quantity=qty,
                unit=(gen_ing.unit.strip() or ing_obj.default_unit)[:20],
            )
            db.add(link)

        created_recipes.append(db_recipe)

    db.flush()
    return created_recipes