from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.ingredient import IngredientRead


class RecipeIngredientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ingredient: IngredientRead
    quantity: Decimal
    unit: str


class RecipeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    servings: int
    prep_time_minutes: int


class RecipeRead(RecipeSummary):
    instructions: str
    ingredients: list[RecipeIngredientRead]


class RecipePage(BaseModel):
    items: list[RecipeSummary]
    total: int
    limit: int
    offset: int
