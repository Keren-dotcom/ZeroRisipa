from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Ingredient
from app.schemas.ingredient import IngredientCreate, IngredientRead

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("", response_model=list[IngredientRead])
def list_ingredients(
    q: str | None = Query(default=None, description="Caută după nume (pentru autocomplete)"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Ingredient]:
    """Catalogul de alimente, ordonat alfabetic."""
    stmt = select(Ingredient).order_by(Ingredient.name).limit(limit)
    if q:
        stmt = stmt.where(Ingredient.name.ilike(f"%{q.strip()}%"))
    return list(db.scalars(stmt))


@router.post(
    "",
    response_model=IngredientRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_user)],
)
def create_ingredient(data: IngredientCreate, db: Session = Depends(get_db)) -> Ingredient:
    """Adaugă un aliment în catalog (până vine seed-ul din ZER-5, așa se populează)."""
    name = data.name.strip().lower()
    if db.scalar(select(Ingredient).where(func.lower(Ingredient.name) == name)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Alimentul există deja în catalog"
        )
    ingredient = Ingredient(name=name, category=data.category, default_unit=data.default_unit)
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient
