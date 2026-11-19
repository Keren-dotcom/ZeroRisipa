# ZeroRisipa – Backend

The ZeroRisipa API: Python + FastAPI, PostgreSQL, SQLAlchemy 2 and Alembic for migrations.

## Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app (CORS, routers)
│   ├── core/
│   │   ├── config.py    # settings read from .env
│   │   ├── security.py  # password hashing (bcrypt) and JWT tokens
│   │   └── deps.py      # FastAPI dependencies, e.g. get_current_user
│   ├── db/              # engine, session, Base for models
│   ├── models/          # SQLAlchemy models (tables)
│   ├── schemas/         # Pydantic schemas (request/response)
│   ├── routers/         # endpoints, one file per resource
│   ├── services/        # business logic (empty for now; the meal planner goes here)
│   └── seed.py          # loads the seed data: python -m app.seed
├── seed/                # ingredients.json and recipes.json
├── alembic/             # migrations
├── tests/               # PyTest tests
├── Dockerfile           # the API image (Python 3.12)
├── docker-compose.yml   # PostgreSQL (`db`) and, optionally, the API (`api`)
├── .python-version      # Python version for pyenv/uv (3.12)
└── .env.example         # template for .env
```

## Database

Tables: `users`, `ingredients`, `pantry_items`, `recipes`, `recipe_ingredients`. The ERD and the design decisions are in [docs/ERD.md](../docs/ERD.md).

## Requirements

- Docker + Docker Compose
- Python **3.11, 3.12 or 3.13** if you run the API on your computer (option B). 3.12 is the team's reference version. Python 3.14 does not work yet: some pinned packages (e.g. `psycopg-binary==3.2.9`) have no 3.14 builds, so `pip install` fails.

You can run the API in two ways. Both use the same `.env` and the same database.

## Option A: everything in Docker (recommended if your Python version differs)

From the `backend/` folder:

```bash
cp .env.example .env
docker compose up -d --build
```

This starts PostgreSQL and the API with Python 3.12, whatever Python you have installed. On every start the `api` container applies the migrations (`alembic upgrade head`) and loads the seed data, then runs the API with `--reload` on http://localhost:8000. Your code is mounted into the container, so saved changes restart the server without a rebuild.

Don't edit `.env` for Docker: inside the container `POSTGRES_HOST` and `POSTGRES_PORT` are set to the `db` service automatically.

| What | Command |
|---|---|
| See the API logs | `docker compose logs -f api` |
| Rebuild after changing `requirements.txt` | `docker compose up -d --build` |
| Run a command in the container | `docker compose exec api alembic upgrade head` |
| Run the tests | `docker compose exec api pytest` |
| Stop everything (data is kept) | `docker compose down` |

If port 8000 is taken, set `API_PORT=8001` in `.env`.

## Option B: running the API on your computer

Run every command from the `backend/` folder.

1. **Configuration**

   ```bash
   cp .env.example .env
   ```

   `.env` is not committed. The default values work for local development.

2. **Start PostgreSQL**

   ```bash
   docker compose up -d db
   ```

3. **Virtual environment and dependencies**

   ```bash
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Migrations**

   ```bash
   alembic upgrade head
   ```

5. **Initial data (seed)**

   ```bash
   python -m app.seed
   ```

   Loads the ingredients from `seed/ingredients.json` and the recipes from `seed/recipes.json`. You can run it any number of times: anything that already exists (matched by name) is updated, not duplicated.

6. **Start the API**

   ```bash
   uvicorn app.main:app --reload
   ```

   - Interactive docs: http://localhost:8000/docs
   - Check: http://localhost:8000/health should return `{"status": "ok", "database": "ok"}`

## Authentication

| Endpoint | What it does |
|---|---|
| `POST /auth/register` | creates an account: `{"email", "password", "full_name"?}`; the password needs at least 8 characters and is stored hashed with bcrypt |
| `POST /auth/login` | `{"email", "password"}` → `{"access_token", "token_type": "bearer"}` |
| `GET /auth/me` | the logged-in user's details; requires the `Authorization: Bearer <token>` header |

To protect a new endpoint, add the `get_current_user` dependency:

```python
from app.core.deps import get_current_user
from app.models import User

@router.get("/pantry")
def list_pantry(user: User = Depends(get_current_user)): ...
```

In http://localhost:8000/docs: call `/auth/login`, copy the `access_token`, click **Authorize** and paste the token.

The token expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (60 by default). The signing key is `JWT_SECRET_KEY` in `.env`.

## Pantry and food catalogue

The catalogue has two parts: the **shared catalogue**, loaded by the seed and visible to everyone, and each user's **own ingredients**, which only that user can see and use.

Every `/pantry` endpoint requires login. Each user only sees and changes their own items; someone else's item returns 404. A pantry item can use an ingredient from the shared catalogue or from your own catalogue.

| Endpoint | What it does |
|---|---|
| `GET /ingredients?q=mil` | searches by name (for autocomplete): the shared catalogue plus, when logged in, your own ingredients; each result has `is_custom` |
| `POST /ingredients` | adds an ingredient to your own catalogue: `{"name", "default_unit", "category"?}`; requires login; 409 if the name is already in the shared catalogue or in yours |
| `GET /pantry` | your pantry; `sort=expiry_date` (default), `-expiry_date`, `created_at`, `-created_at`; `expiring_within_days=N` keeps only what expires soon |
| `POST /pantry` | `{"ingredient_id", "quantity", "unit", "expiry_date"}` |
| `GET /pantry/{id}` | one pantry item |
| `PATCH /pantry/{id}` | changes only the fields you send |
| `DELETE /pantry/{id}` | deletes the item |

## Recipes

| Endpoint | What it does |
|---|---|
| `GET /recipes?limit=20&offset=0&q=...` | list of recipes, alphabetical: `{"items", "total", "limit", "offset"}` |
| `GET /recipes/{id}` | the recipe with instructions and ingredients (quantity + unit) |

To add or change recipes, edit `seed/recipes.json` and run `python -m app.seed` again. Every ingredient in a recipe must exist in `seed/ingredients.json` (names are compared case-insensitively); otherwise the script stops and tells you what is missing.

## New migrations

After you add or change a model in `app/models/` (and import it in `app/models/__init__.py`):

```bash
alembic revision --autogenerate -m "short description"
alembic upgrade head
```

Check the generated file in `alembic/versions/` before committing.

## Tests

With the database running:

```bash
pytest
```

## Postman

The collection with every endpoint and its tests is in [docs/postman](../docs/postman/README.md).

## Common problems

- **Port 5432 is taken** (you already have Postgres installed): change `POSTGRES_PORT` in `.env`, for example to `5433`, then run `docker compose up -d db` again.
- **`pip install` fails** (often while building `psycopg-binary` or `pydantic-core`): your Python is probably 3.14 or newer. Use Python 3.12 (see `.python-version`) or option A. Don't change `.env` to work around it: `.env` only holds settings, not the Python version.
- **`/health` returns 503**: the `db` container isn't running or the values in `.env` don't match. Check with `docker compose ps`.
