from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Ingredient, PantryItem, Recipe, RecipeIngredient, User


@pytest.fixture
def db():
    # Requires Postgres running and `alembic upgrade head` applied.
    # Everything runs in a transaction rolled back at the end, so the database stays clean.
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    transaction.rollback()
    connection.close()


def test_pantry_and_recipe_roundtrip(db: Session) -> None:
    user = User(email="ana@example.com", hashed_password="hash")
    milk = Ingredient(name="milk", category="dairy", default_unit="ml")
    eggs = Ingredient(name="eggs", category="eggs", default_unit="pcs")
    db.add_all([user, milk, eggs])
    db.flush()

    db.add(
        PantryItem(
            user=user,
            ingredient=milk,
            quantity=Decimal("500"),
            unit="ml",
            expiry_date=date.today() + timedelta(days=2),
        )
    )
    clatite = Recipe(
        name="Pancakes",
        instructions="Mix and fry.",
        servings=4,
        prep_time_minutes=30,
        ingredients=[
            RecipeIngredient(ingredient=milk, quantity=Decimal("300"), unit="ml"),
            RecipeIngredient(ingredient=eggs, quantity=Decimal("2"), unit="pcs"),
        ],
    )
    db.add(clatite)
    db.flush()

    db.refresh(user)
    assert user.is_active is True
    assert len(user.pantry_items) == 1
    names = {ri.ingredient.name for ri in clatite.ingredients}
    assert names == {"milk", "eggs"}

    # Items expiring within 3 days, ordered by expiry.
    soon = db.scalars(
        select(PantryItem)
        .where(PantryItem.user_id == user.id)
        .where(PantryItem.expiry_date <= date.today() + timedelta(days=3))
        .order_by(PantryItem.expiry_date)
    ).all()
    assert [p.ingredient.name for p in soon] == ["milk"]


def test_email_is_unique(db: Session) -> None:
    db.add(User(email="duplicate@example.com", hashed_password="x"))
    db.flush()
    db.add(User(email="duplicate@example.com", hashed_password="y"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_quantity_must_be_positive(db: Session) -> None:
    user = User(email="b@example.com", hashed_password="x")
    ing = Ingredient(name="carrot", default_unit="pcs")
    db.add_all([user, ing])
    db.flush()
    db.add(
        PantryItem(
            user=user,
            ingredient=ing,
            quantity=Decimal("0"),
            unit="pcs",
            expiry_date=date.today(),
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()
