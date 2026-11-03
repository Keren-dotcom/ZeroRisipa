from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient
    from app.models.pantry_item import PantryItem


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=true())

    pantry_items: Mapped[list["PantryItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    # The user's own ingredients (not part of the shared catalogue).
    ingredients: Mapped[list["Ingredient"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
