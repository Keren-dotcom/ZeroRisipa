from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models import Ingredient, User
from app.schemas.ingredient import IngredientCreate, IngredientRead

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("", response_model=list[IngredientRead])
def list_ingredients(
    q: str | None = Query(default=None, description="Search by name (for autocomplete)"),
    limit: int = Query(default=20, ge=1, le=100),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> list[Ingredient]:
    """The shared food catalogue, plus your own ingredients when logged in, alphabetically."""
    stmt = (
        select(Ingredient)
        .where(Ingredient.visible_to(user.id if user else None))
        .order_by(Ingredient.name, Ingredient.id)
        .limit(limit)
    )
    if q:
        stmt = stmt.where(Ingredient.name.ilike(f"%{q.strip()}%"))
    return list(db.scalars(stmt))


@router.post("", response_model=IngredientRead, status_code=status.HTTP_201_CREATED)
def create_ingredient(
    data: IngredientCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Ingredient:
    """Add an ingredient to your own catalogue. Other users don't see it."""
    name = data.name.strip().lower()
    existing = db.scalar(
        select(Ingredient).where(Ingredient.visible_to(user.id), Ingredient.name == name)
    )
    if existing:
        detail = (
            "This ingredient is already in your catalogue"
            if existing.is_custom
            else "This ingredient is already in the shared catalogue"
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
    ingredient = Ingredient(
        name=name, category=data.category, default_unit=data.default_unit, owner_id=user.id
    )
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient
