"""Încarcă în baza de date catalogul de ingrediente și rețetele din folderul `seed/`.

Rulare (din `backend/`, după `alembic upgrade head`):

    python -m app.seed

Scriptul poate fi rulat de mai multe ori: ingredientele și rețetele existente
(după nume) sunt actualizate, nu duplicate.
"""

import json
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Ingredient, Recipe, RecipeIngredient

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"


def _load(filename: str) -> list[dict]:
    with open(SEED_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def seed_ingredients(db: Session, data: list[dict]) -> dict[str, Ingredient]:
    existing = {i.name.lower(): i for i in db.scalars(select(Ingredient))}
    for row in data:
        name = row["name"].strip().lower()
        ingredient = existing.get(name)
        if ingredient is None:
            ingredient = Ingredient(name=name)
            db.add(ingredient)
            existing[name] = ingredient
        ingredient.category = row.get("category")
        ingredient.default_unit = row["default_unit"]
    db.flush()
    return existing


def seed_recipes(db: Session, data: list[dict], ingredients: dict[str, Ingredient]) -> None:
    for row in data:
        missing = [
            i["name"] for i in row["ingredients"] if i["name"].strip().lower() not in ingredients
        ]
        if missing:
            raise ValueError(
                f"Rețeta „{row['name']}” folosește ingrediente care lipsesc din "
                f"ingredients.json: {', '.join(missing)}"
            )

        recipe = db.scalar(select(Recipe).where(func.lower(Recipe.name) == row["name"].lower()))
        if recipe is None:
            recipe = Recipe(name=row["name"])
            db.add(recipe)
        recipe.description = row.get("description")
        recipe.instructions = row["instructions"]
        recipe.servings = row["servings"]
        recipe.prep_time_minutes = row["prep_time_minutes"]
        # Lista de ingrediente se înlocuiește complet, ca să reflecte fișierul.
        recipe.ingredients.clear()
        db.flush()
        recipe.ingredients.extend(
            RecipeIngredient(
                ingredient=ingredients[i["name"].strip().lower()],
                quantity=Decimal(str(i["quantity"])),
                unit=i["unit"],
            )
            for i in row["ingredients"]
        )
    db.flush()


def run(db: Session) -> tuple[int, int]:
    ingredients = seed_ingredients(db, _load("ingredients.json"))
    recipes = _load("recipes.json")
    seed_recipes(db, recipes, ingredients)
    return len(ingredients), len(recipes)


def main() -> None:
    with SessionLocal() as db:
        n_ingredients, n_recipes = run(db)
        db.commit()
    print(f"Seed gata: {n_ingredients} ingrediente în catalog, {n_recipes} rețete încărcate.")


if __name__ == "__main__":
    main()
