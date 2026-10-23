from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient
    from app.models.user import User


class PantryItem(TimestampMixin, Base):
    """Un aliment din cămara unui utilizator, cu cantitate și dată de expirare."""

    __tablename__ = "pantry_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    ingredient_id: Mapped[int] = mapped_column(
        ForeignKey("ingredients.id", ondelete="RESTRICT"), index=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    unit: Mapped[str] = mapped_column(String(20))
    # Index: algoritmul de optimizare caută des alimentele care expiră curând.
    expiry_date: Mapped[date] = mapped_column(Date, index=True)

    user: Mapped["User"] = relationship(back_populates="pantry_items")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="pantry_items")
