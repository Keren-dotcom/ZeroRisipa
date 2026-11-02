from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
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


def register(client: TestClient, email: str = "ana@example.com", password: str = "parola123"):
    return client.post("/auth/register", json={"email": email, "password": password})


def login(client: TestClient, email: str = "ana@example.com", password: str = "parola123"):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_login_me(client: TestClient) -> None:
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ana@example.com"
    assert "password" not in body and "hashed_password" not in body

    response = login(client)
    assert response.status_code == 200
    token = response.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "ana@example.com"


def test_register_duplicate_email_case_insensitive(client: TestClient) -> None:
    assert register(client).status_code == 201
    response = register(client, email="ANA@example.com")
    assert response.status_code == 409


def test_register_rejects_short_password_and_bad_email(client: TestClient) -> None:
    assert register(client, password="scurt").status_code == 422
    assert register(client, email="nu-e-email").status_code == 422


def test_login_wrong_password(client: TestClient) -> None:
    register(client)
    assert login(client, password="gresita123").status_code == 401
    assert login(client, email="altcineva@example.com").status_code == 401


def test_me_requires_valid_token(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
    bad = {"Authorization": "Bearer token-invalid"}
    assert client.get("/auth/me", headers=bad).status_code == 401
    # Token valid ca semnătură, dar pentru un utilizator care nu există.
    ghost = {"Authorization": f"Bearer {create_access_token(999999)}"}
    assert client.get("/auth/me", headers=ghost).status_code == 401
