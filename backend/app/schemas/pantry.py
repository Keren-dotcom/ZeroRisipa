from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ingredient import IngredientRead


class PantryItemCreate(BaseModel):
    ingredient_id: int
    quantity: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    unit: str = Field(min_length=1, max_length=20)
    expiry_date: date


class PantryItemUpdate(BaseModel):
    """Toate câmpurile sunt opționale: se modifică doar ce trimiți."""

    ingredient_id: int | None = None
    quantity: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    expiry_date: date | None = None


class PantryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient: IngredientRead
    quantity: Decimal
    unit: str
    expiry_date: date
    created_at: datetime
    updated_at: datetime
