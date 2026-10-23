from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pantry_item import PantryItem
    from app.models.recipe import RecipeIngredient


class Ingredient(TimestampMixin, Base):
    """Catalogul comun de alimente, folosit atât în cămară cât și în rețete."""

    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    category: Mapped[str | None] = mapped_column(String(50))  # ex. lactate, legume
    default_unit: Mapped[str] = mapped_column(String(20))  # ex. g, ml, buc

    pantry_items: Mapped[list["PantryItem"]] = relationship(back_populates="ingredient")
    recipe_links: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="ingredient"
    )
