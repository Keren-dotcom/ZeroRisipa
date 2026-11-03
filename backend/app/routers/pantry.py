from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Ingredient, PantryItem, User
from app.schemas.pantry import PantryItemCreate, PantryItemRead, PantryItemUpdate

router = APIRouter(prefix="/pantry", tags=["pantry"])

SORT_OPTIONS = {
    "expiry_date": PantryItem.expiry_date.asc(),
    "-expiry_date": PantryItem.expiry_date.desc(),
    "created_at": PantryItem.created_at.asc(),
    "-created_at": PantryItem.created_at.desc(),
}


def _get_own_item(db: Session, item_id: int, user: User) -> PantryItem:
    """Return the item only if it belongs to the user; otherwise 404, so we don't reveal
    that it exists in someone else's pantry."""
    item = db.get(PantryItem, item_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pantry item not found")
    return item


def _check_ingredient(db: Session, ingredient_id: int, user: User) -> None:
    """The ingredient must be in the shared catalogue or in the user's own catalogue."""
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None or ingredient.owner_id not in (None, user.id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ingredient not found in the catalogue",
        )


@router.get("", response_model=list[PantryItemRead])
def list_pantry(
    sort: Literal["expiry_date", "-expiry_date", "created_at", "-created_at"] = "expiry_date",
    expiring_within_days: int | None = Query(
        default=None, ge=0, description="Only items that expire within the next N days"
    ),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PantryItem]:
    """The logged-in user's pantry. By default, items expiring first are on top."""
    stmt = (
        select(PantryItem)
        .options(joinedload(PantryItem.ingredient))
        .where(PantryItem.user_id == user.id)
        .order_by(SORT_OPTIONS[sort], PantryItem.id)
    )
    if expiring_within_days is not None:
        limit_date = date.today() + timedelta(days=expiring_within_days)
        stmt = stmt.where(PantryItem.expiry_date <= limit_date)
    return list(db.scalars(stmt))


@router.post("", response_model=PantryItemRead, status_code=status.HTTP_201_CREATED)
def create_pantry_item(
    data: PantryItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PantryItem:
    _check_ingredient(db, data.ingredient_id, user)
    item = PantryItem(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=PantryItemRead)
def get_pantry_item(
    item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> PantryItem:
    return _get_own_item(db, item_id, user)


@router.patch("/{item_id}", response_model=PantryItemRead)
def update_pantry_item(
    item_id: int,
    data: PantryItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PantryItem:
    item = _get_own_item(db, item_id, user)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "ingredient_id" in changes:
        _check_ingredient(db, changes["ingredient_id"], user)
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(
    item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Response:
    item = _get_own_item(db, item_id, user)
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
