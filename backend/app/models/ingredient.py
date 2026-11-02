from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pantry_item import PantryItem
    from app.models.recipe import RecipeIngredient


class Ingredient(TimestampMixin, Base):
    """Shared food catalogue, used by both pantries and recipes."""

    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    category: Mapped[str | None] = mapped_column(String(50))  # e.g. dairy, vegetables
    default_unit: Mapped[str] = mapped_column(String(20))  # e.g. g, ml, pcs

    pantry_items: Mapped[list["PantryItem"]] = relationship(back_populates="ingredient")
    recipe_links: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="ingredient"
    )
