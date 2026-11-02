from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import engine, get_db
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    # Necesită Postgres pornit și `alembic upgrade head` rulat.
    # Fiecare test rulează într-o tranzacție anulată la final, deci baza rămâne curată.
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    app.dependency_overrides[get_db] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()
    session.close()
    transaction.rollback()
    connection.close()
