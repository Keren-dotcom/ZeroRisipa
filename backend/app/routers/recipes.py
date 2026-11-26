from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Recipe, RecipeIngredient, RecipePin, RecipeSuggestion, User
from app.schemas.recipe import RecipePage, RecipeRead
from app.services.gemini_recipes import generate_zero_waste_recipes

router = APIRouter(prefix="/recipes", tags=["recipes"])

# How long generated (unpinned) recipes stay visible after pressing "Generate recipes"
RECIPE_TTL = timedelta(minutes=15)


class RecipeCard(BaseModel):
    id: int
    name: str
    description: str | None = None
    servings: int
    prep_time_minutes: int
    cook_time_minutes: int = 0
    is_pinned: bool = False
    pinned_at: datetime | None = None


class CurrentRecipes(BaseModel):
    items: list[RecipeCard]  # pinned recipes first (most recently pinned on top), then the others
    ttl_minutes: int


def _card(recipe: Recipe, pinned_at: datetime | None = None) -> RecipeCard:
    return RecipeCard(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        servings=recipe.servings,
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        is_pinned=pinned_at is not None,
        pinned_at=pinned_at,
    )


def _current_recipes(db: Session, user_id: int) -> CurrentRecipes:
    """Pinned recipes first, then active generated recipes ordered newest-first."""
    cutoff = datetime.now(timezone.utc) - RECIPE_TTL

    pinned = db.execute(
        select(Recipe, RecipePin.pinned_at)
        .join(RecipePin, RecipePin.recipe_id == Recipe.id)
        .where(RecipePin.user_id == user_id)
        .order_by(RecipePin.pinned_at.desc())
    ).all()
    pinned_ids = {recipe.id for recipe, _ in pinned}

    # Ordonăm descrescător după generated_at și id ca ultimele generate să fie primele sub cele pinned
    suggested = db.scalars(
        select(Recipe)
        .join(RecipeSuggestion, RecipeSuggestion.recipe_id == Recipe.id)
        .where(RecipeSuggestion.user_id == user_id, RecipeSuggestion.generated_at >= cutoff)
        .order_by(RecipeSuggestion.generated_at.desc(), Recipe.id.desc())
    ).all()

    items = [_card(recipe, pinned_at) for recipe, pinned_at in pinned]
    items += [_card(recipe) for recipe in suggested if recipe.id not in pinned_ids]
    return CurrentRecipes(items=items, ttl_minutes=int(RECIPE_TTL.total_seconds() // 60))


def pick_recipes(db: Session, user: User) -> list[Recipe]:
    """Generate zero-waste recipes from the user's pantry using Gemini."""
    return generate_zero_waste_recipes(db, user)


@router.get("", response_model=RecipePage)
def list_recipes(
    q: str | None = Query(default=None, description="Search by recipe name"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> RecipePage:
    """Predefined recipes, in alphabetical order, paginated."""
    stmt = select(Recipe)
    if q:
        stmt = stmt.where(Recipe.name.ilike(f"%{q.strip()}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(stmt.order_by(Recipe.name, Recipe.id).limit(limit).offset(offset)).all()
    return RecipePage(items=items, total=total, limit=limit, offset=offset)


# NOTE: "/current" and "/generate" must stay above "/{recipe_id}", otherwise FastAPI tries to read "current" as an id.
@router.get("/current", response_model=CurrentRecipes)
def current_recipes(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> CurrentRecipes:
    """What the Recipes page shows: pinned recipes + recipes generated in the last 15 minutes."""
    return _current_recipes(db, user.id)


@router.post("/generate", response_model=CurrentRecipes)
def generate_recipes(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> CurrentRecipes:
    """"Generate recipes": adds 6 new recipes on top of existing (non-expired) ones. Pins and active recipes are kept."""
    now = datetime.now(timezone.utc)
    # Ștergem DOAR sugestiile expirate (mai vechi de 15 min), păstrăm ce e deja generat și activ
    db.execute(
        delete(RecipeSuggestion).where(RecipeSuggestion.generated_at < now - RECIPE_TTL)
    )
    for recipe in pick_recipes(db, user):
        db.add(RecipeSuggestion(user_id=user.id, recipe_id=recipe.id, generated_at=now))
    db.commit()
    return _current_recipes(db, user.id)


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)) -> Recipe:
    """A recipe, with its ingredients and quantities."""
    recipe = db.scalar(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient))
    )
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return recipe


@router.put("/{recipe_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
def pin_recipe(recipe_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    """Pin a recipe. Pinning an already pinned recipe does nothing."""
    if db.get(Recipe, recipe_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    if db.get(RecipePin, (user.id, recipe_id)) is None:
        db.add(RecipePin(user_id=user.id, recipe_id=recipe_id))
        db.commit()


@router.delete("/{recipe_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
def unpin_recipe(recipe_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    """Remove the pin. Does nothing if the recipe was not pinned."""
    db.execute(delete(RecipePin).where(RecipePin.user_id == user.id, RecipePin.recipe_id == recipe_id))
    db.commit()