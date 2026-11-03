from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Ingredient


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    client.post("/auth/register", json={"email": email, "password": "password123"})
    token = client.post("/auth/login", json={"email": email, "password": "password123"}).json()[
        "access_token"
    ]
    return {"Authorization": f"Bearer {token}"}


def create_ingredient(client: TestClient, headers: dict[str, str], name: str) -> int:
    response = client.post(
        "/ingredients", json={"name": name, "default_unit": "g"}, headers=headers
    )
    assert response.status_code == 201
    return response.json()["id"]


def add_item(client, headers, ingredient_id, days: int, quantity: str = "200"):
    return client.post(
        "/pantry",
        json={
            "ingredient_id": ingredient_id,
            "quantity": quantity,
            "unit": "g",
            "expiry_date": (date.today() + timedelta(days=days)).isoformat(),
        },
        headers=headers,
    )


def test_ingredients_search(client: TestClient) -> None:
    headers = auth_headers(client, "ana@example.com")
    for name in ["Milk", "coconut milk", "carrot"]:
        create_ingredient(client, headers, name)
    found = client.get("/ingredients", params={"q": "MIL"}, headers=headers).json()
    assert [i["name"] for i in found] == ["coconut milk", "milk"]
    duplicate = client.post(
        "/ingredients", json={"name": "MILK", "default_unit": "ml"}, headers=headers
    )
    assert duplicate.status_code == 409


def test_pantry_crud(client: TestClient) -> None:
    headers = auth_headers(client, "ana@example.com")
    milk = create_ingredient(client, headers, "milk")
    eggs = create_ingredient(client, headers, "eggs")

    created = add_item(client, headers, milk, days=5)
    assert created.status_code == 201
    item = created.json()
    assert item["ingredient"]["name"] == "milk"
    add_item(client, headers, eggs, days=1)

    listing = client.get("/pantry", headers=headers).json()
    assert [i["ingredient"]["name"] for i in listing] == ["eggs", "milk"]
    soon = client.get("/pantry", params={"expiring_within_days": 2}, headers=headers).json()
    assert [i["ingredient"]["name"] for i in soon] == ["eggs"]

    updated = client.patch(f"/pantry/{item['id']}", json={"quantity": "50"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["quantity"] == "50.00"
    assert updated.json()["unit"] == "g"

    assert client.delete(f"/pantry/{item['id']}", headers=headers).status_code == 204
    assert client.get(f"/pantry/{item['id']}", headers=headers).status_code == 404


def test_pantry_validation(client: TestClient) -> None:
    headers = auth_headers(client, "ana@example.com")
    milk = create_ingredient(client, headers, "milk")
    assert add_item(client, headers, milk, days=1, quantity="0").status_code == 422
    assert add_item(client, headers, 999999, days=1).status_code == 422


def test_pantry_requires_login(client: TestClient) -> None:
    assert client.get("/pantry").status_code == 401
    assert client.post("/ingredients", json={"name": "x", "default_unit": "g"}).status_code == 401


def test_users_cannot_touch_each_others_pantry(client: TestClient) -> None:
    ana = auth_headers(client, "ana@example.com")
    ion = auth_headers(client, "ion@example.com")
    milk = create_ingredient(client, ana, "milk")
    item_id = add_item(client, ana, milk, days=3).json()["id"]

    assert client.get("/pantry", headers=ion).json() == []
    assert client.get(f"/pantry/{item_id}", headers=ion).status_code == 404
    assert client.patch(f"/pantry/{item_id}", json={"unit": "kg"}, headers=ion).status_code == 404
    assert client.delete(f"/pantry/{item_id}", headers=ion).status_code == 404
    # Ana's item was left untouched.
    assert client.get(f"/pantry/{item_id}", headers=ana).json()["unit"] == "g"


def add_shared_ingredient(db_session: Session, name: str) -> int:
    ingredient = Ingredient(name=name, default_unit="g")
    db_session.add(ingredient)
    db_session.flush()
    return ingredient.id


def test_custom_ingredients_are_private(client: TestClient, db_session: Session) -> None:
    add_shared_ingredient(db_session, "rice")
    ana = auth_headers(client, "ana@example.com")
    ion = auth_headers(client, "ion@example.com")
    create_ingredient(client, ana, "kimchi")

    def names(headers=None) -> dict[str, bool]:
        response = client.get("/ingredients", headers=headers or {})
        return {i["name"]: i["is_custom"] for i in response.json()}

    assert names(ana) == {"kimchi": True, "rice": False}
    assert names(ion) == {"rice": False}
    assert names() == {"rice": False}


def test_custom_ingredient_name_rules(client: TestClient, db_session: Session) -> None:
    add_shared_ingredient(db_session, "rice")
    ana = auth_headers(client, "ana@example.com")
    ion = auth_headers(client, "ion@example.com")

    shared = client.post("/ingredients", json={"name": "Rice", "default_unit": "g"}, headers=ana)
    assert shared.status_code == 409
    assert "shared" in shared.json()["detail"]

    # The same custom name is fine for two different users, but not twice for one.
    create_ingredient(client, ana, "kimchi")
    create_ingredient(client, ion, "kimchi")
    again = client.post("/ingredients", json={"name": "kimchi", "default_unit": "g"}, headers=ana)
    assert again.status_code == 409
    assert "your catalogue" in again.json()["detail"]


def test_pantry_only_accepts_visible_ingredients(client: TestClient, db_session: Session) -> None:
    rice = add_shared_ingredient(db_session, "rice")
    ana = auth_headers(client, "ana@example.com")
    ion = auth_headers(client, "ion@example.com")
    kimchi = create_ingredient(client, ana, "kimchi")

    assert add_item(client, ana, kimchi, days=3).status_code == 201
    assert add_item(client, ion, rice, days=3).status_code == 201
    # Ion can't use Ana's private ingredient, neither when adding nor when editing.
    assert add_item(client, ion, kimchi, days=3).status_code == 422
    item_id = add_item(client, ion, rice, days=3).json()["id"]
    edit = client.patch(f"/pantry/{item_id}", json={"ingredient_id": kimchi}, headers=ion)
    assert edit.status_code == 422
