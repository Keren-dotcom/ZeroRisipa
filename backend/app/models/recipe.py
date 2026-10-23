from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient


class Recipe(TimestampMixin, Base):
    """Rețetă predefinită din baza internă."""

    __tablename__ = "recipes"
    __table_args__ = (
        CheckConstraint("servings > 0", name="servings_positive"),
        CheckConstraint("prep_time_minutes >= 0", name="prep_time_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    instructions: Mapped[str] = mapped_column(Text)
    servings: Mapped[int] = mapped_column(Integer)
    prep_time_minutes: Mapped[int] = mapped_column(Integer)

    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan"
    )


class RecipeIngredient(Base):
    """Legătura rețetă–ingredient, cu cantitatea necesară."""

    __tablename__ = "recipe_ingredients"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[int] = mapped_column(
        ForeignKey("ingredients.id", ondelete="RESTRICT"), primary_key=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    unit: Mapped[str] = mapped_column(String(20))

    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="recipe_links")
