from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import seed
from app.models import Recipe, RecipeIngredient


def test_seed_is_idempotent(db_session: Session) -> None:
    n_ingredients, n_recipes = seed.run(db_session)
    seed.run(db_session)
    assert db_session.scalar(select(func.count()).select_from(Recipe)) == n_recipes
    links = db_session.scalar(select(func.count()).select_from(RecipeIngredient))
    expected = sum(len(r["ingredients"]) for r in seed._load("recipes.json"))
    assert links == expected
    assert n_ingredients >= 30


def test_seed_rejects_unknown_ingredient(db_session: Session) -> None:
    ingredients = seed.seed_ingredients(db_session, seed._load("ingredients.json"))
    bad = [{"name": "X", "instructions": "-", "servings": 1, "prep_time_minutes": 1,
            "ingredients": [{"name": "unicorn", "quantity": 1, "unit": "pcs"}]}]
    try:
        seed.seed_recipes(db_session, bad, ingredients)
    except ValueError as exc:
        assert "unicorn" in str(exc)
    else:
        raise AssertionError("expected an error")


def test_list_and_detail(client: TestClient, db_session: Session) -> None:
    _, n_recipes = seed.run(db_session)

    page = client.get("/recipes", params={"limit": 5}).json()
    assert page["total"] == n_recipes
    assert len(page["items"]) == 5
    names = [r["name"] for r in page["items"]]
    assert names == sorted(names)

    second = client.get("/recipes", params={"limit": 5, "offset": 5}).json()
    assert not set(names) & {r["name"] for r in second["items"]}

    found = client.get("/recipes", params={"q": "pancak"}).json()
    assert [r["name"] for r in found["items"]] == ["Pancakes"]

    detail = client.get(f"/recipes/{found['items'][0]['id']}").json()
    ingredients = {i["ingredient"]["name"]: i for i in detail["ingredients"]}
    assert ingredients["milk"]["quantity"] == "500.00"
    assert ingredients["milk"]["unit"] == "ml"
    assert "instructions" in detail


def test_recipe_not_found(client: TestClient) -> None:
    assert client.get("/recipes/999999").status_code == 404
