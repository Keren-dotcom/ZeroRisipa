from datetime import date, timedelta

from fastapi.testclient import TestClient


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
    names = [i["name"] for i in client.get("/ingredients", params={"q": "MIL"}).json()]
    assert names == ["coconut milk", "milk"]
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
