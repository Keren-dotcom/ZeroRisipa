from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Recipe, RecipeIngredient
from app.schemas.recipe import RecipePage, RecipeRead

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=RecipePage)
def list_recipes(
    q: str | None = Query(default=None, description="Search by recipe name"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> RecipePage:
    """Predefined recipes with their ingredients, in alphabetical order, paginated."""
    stmt = select(Recipe)
    if q:
        stmt = stmt.where(Recipe.name.ilike(f"%{q.strip()}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.order_by(Recipe.name, Recipe.id)
        .limit(limit)
        .offset(offset)
        .options(selectinload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient))
    ).all()
    return RecipePage(items=items, total=total, limit=limit, offset=offset)


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
