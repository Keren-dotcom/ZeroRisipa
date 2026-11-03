from typing import TYPE_CHECKING

from sqlalchemy import ColumnElement, ForeignKey, Index, String, or_, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pantry_item import PantryItem
    from app.models.recipe import RecipeIngredient
    from app.models.user import User


class Ingredient(TimestampMixin, Base):
    """Food catalogue, used by both pantries and recipes.

    `owner_id` is NULL for the shared catalogue (loaded by the seed) and set for a
    user's own ingredients, which only that user can see.
    """

    __tablename__ = "ingredients"
    __table_args__ = (
        # Names are stored lowercase: unique within the shared catalogue,
        # and unique within each user's own catalogue.
        Index(
            "uq_ingredients_shared_name",
            "name",
            unique=True,
            postgresql_where=text("owner_id IS NULL"),
        ),
        Index(
            "uq_ingredients_owner_name",
            "owner_id",
            "name",
            unique=True,
            postgresql_where=text("owner_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str | None] = mapped_column(String(50))  # e.g. dairy, vegetables
    default_unit: Mapped[str] = mapped_column(String(20))  # e.g. g, ml, pcs
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    owner: Mapped["User | None"] = relationship(back_populates="ingredients")
    pantry_items: Mapped[list["PantryItem"]] = relationship(back_populates="ingredient")
    recipe_links: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="ingredient"
    )

    @property
    def is_custom(self) -> bool:
        return self.owner_id is not None

    @classmethod
    def visible_to(cls, user_id: int | None) -> ColumnElement[bool]:
        """Filter for the ingredients a user can see: the shared catalogue plus their own."""
        if user_id is None:
            return cls.owner_id.is_(None)
        return or_(cls.owner_id.is_(None), cls.owner_id == user_id)
