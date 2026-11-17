# Developer tutorial: from clone to first pull request

This tutorial takes a new team member from an empty computer to a running ZeroRisipa app and a first pull request. It follows the READMEs step by step and explains what each step does and how to check that it worked.

Plan for about 45 minutes the first time.

- [1. Install the tools](#1-install-the-tools)
- [2. Get the code](#2-get-the-code)
- [3. Start the database](#3-start-the-database)
- [4. Set up and run the backend](#4-set-up-and-run-the-backend)
- [5. Try the API](#5-try-the-api)
- [6. Run the frontend](#6-run-the-frontend)
- [7. Walk through the app](#7-walk-through-the-app)
- [8. Run the tests](#8-run-the-tests)
- [9. Make your first change](#9-make-your-first-change)
- [10. Everyday commands](#10-everyday-commands)
- [Troubleshooting](#troubleshooting)

---

## 1. Install the tools

| Tool | Version | Check with |
|---|---|---|
| Git | any recent | `git --version` |
| Python | 3.11 or newer | `python --version` (on macOS/Linux it may be `python3`) |
| Node.js + npm | Node 20 or newer | `node --version`, `npm --version` |
| Docker Desktop | any recent | `docker --version`, `docker compose version` |
| An editor | e.g. VS Code | |

Optional: [Postman](https://www.postman.com/downloads/) for trying the API by hand.

Start Docker Desktop and leave it running. The database lives in a Docker container.

> **Windows:** use PowerShell or the VS Code terminal. Wherever this tutorial says `cp`, PowerShell accepts it too; in the old `cmd` use `copy` instead.

## 2. Get the code

```bash
git clone https://github.com/Keren-dotcom/ZeroRisipa.git
cd ZeroRisipa
```

Look around. The three folders that matter are:

```
backend/    FastAPI API, models, migrations, seed data, tests
frontend/   React + Vite app
docs/       ERD (database diagram) and the Postman collection
```

Read [docs/ERD.md](ERD.md) once. It shows the five tables (`users`, `ingredients`, `pantry_items`, `recipes`, `recipe_ingredients`) and why they look the way they do.

## 3. Start the database

Everything in steps 3 to 5 runs from `backend/`.

```bash
cd backend
cp .env.example .env
docker compose up -d db
```

- `.env` holds local settings (database user, password, port, JWT key). It is never committed. The defaults work as they are.
- `docker compose up -d db` downloads PostgreSQL 16 the first time and starts it in the background.

**Check:** `docker compose ps` shows the `db` service as `running` (or `healthy`).

## 4. Set up and run the backend

### 4.1 Virtual environment and dependencies

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The virtual environment keeps the project's Python packages separate from the rest of your computer. When it's active, your prompt starts with `(.venv)`. Activate it again in every new terminal you open for the backend.

### 4.2 Create the tables

```bash
alembic upgrade head
```

Alembic runs the migrations in `alembic/versions/` and creates every table.

### 4.3 Load the starter data

```bash
python -m app.seed
```

This loads the shared ingredient catalogue from `seed/ingredients.json` and the recipes from `seed/recipes.json`. You can run it again any time: existing rows are updated by name, not duplicated.

### 4.4 Start the API

```bash
uvicorn app.main:app --reload
```

`--reload` restarts the server whenever you save a Python file. Leave this terminal open.

**Check:** open http://localhost:8000/health. You should see:

```json
{"status": "ok", "database": "ok"}
```

If `database` is not `ok`, see [Troubleshooting](#troubleshooting).

## 5. Try the API

Open http://localhost:8000/docs. This page lists every endpoint and lets you call them from the browser.

1. **Create an account:** open `POST /auth/register` → **Try it out** → send:
   ```json
   {"email": "me@example.com", "password": "password123", "full_name": "Me"}
   ```
   You get `201` and your user.
2. **Log in:** `POST /auth/login` with the same email and password. Copy the `access_token` from the response.
3. **Authorize:** click **Authorize** at the top of the page, paste the token, confirm. Protected endpoints now send it for you.
4. **Find an ingredient:** `GET /ingredients` with `q = milk`. Note the `id` of a result.
5. **Add it to your pantry:** `POST /pantry` with
   ```json
   {"ingredient_id": 1, "quantity": 1, "unit": "ml", "expiry_date": "2026-12-01"}
   ```
   (use the `id` you found).
6. **List your pantry:** `GET /pantry`. Try `expiring_within_days = 3`.
7. **Browse recipes:** `GET /recipes`, then `GET /recipes/{id}` for one of them.

Every endpoint is described in [backend/README.md](../backend/README.md).

## 6. Run the frontend

Open a **second terminal** (the API keeps running in the first one).

```bash
cd frontend
npm install
npm run dev
```

- `npm install` downloads the JavaScript packages into `node_modules/` (the first time only, or after `package.json` changes).
- You only need `cp .env.example .env` if the API is not on http://localhost:8000.

**Check:** open the address Vite prints, usually http://localhost:5173. You should see the login page.

## 7. Walk through the app

1. Click **Sign up** and create an account (or log in with the one from step 5).
2. You land on **Pantry**. Add an item: start typing a name and pick it from the suggestions; the unit fills in from the ingredient's default.
3. Add something that isn't in the catalogue, e.g. "Grandma's jam". When you save, it is added to *your own* catalogue; other users don't see it.
4. Give one item an expiry date within the next 3 days. It is highlighted as expiring soon, and the list is sorted by expiry date.
5. Edit and delete an item.
6. **Recipes** is still a placeholder page.

How the frontend talks to the API: `src/api/axiosClient.js` adds your JWT (stored in `localStorage` after login) to every request and sends you back to `/login` when the token expires.

## 8. Run the tests

### Backend (PyTest)

With the database running and the virtual environment active, from `backend/`:

```bash
pytest
```

Each test runs inside a database transaction that is rolled back afterwards, so your local data isn't touched. All tests should pass. Run one file with `pytest tests/test_pantry.py`, or one test with `pytest -k test_name`.

### API (Postman)

1. With the API running, open Postman → **Import** → pick both files from `docs/postman/`.
2. Select the **ZeroRisipa local** environment (top right).
3. Right-click the collection → **Run collection**. Every check should be green.

From the command line instead:

```bash
npx newman run docs/postman/ZeroRisipa.postman_collection.json \
  -e docs/postman/ZeroRisipa.local.postman_environment.json
```

(run it from the repository root).

### Frontend (lint)

From `frontend/`:

```bash
npm run lint
```

## 9. Make your first change

This is the team's workflow, from a Linear task to a merged pull request.

### 9.1 Start from an up-to-date main

```bash
git checkout main
git pull
git checkout -b your-name/zer-XX-short-description
```

Use the Linear task key (`ZER-XX`) in the branch name so the task and the PR link up. One task, one branch, one PR.

### 9.2 Make the change

Everything you write, code, comments, API messages and docs, is in **English**.

Common kinds of change:

- **A new endpoint:** add it in `backend/app/routers/` (one file per resource), with its Pydantic schemas in `app/schemas/`. If it needs login, add the dependency:
  ```python
  from app.core.deps import get_current_user
  from app.models import User

  @router.get("/something")
  def read_something(user: User = Depends(get_current_user)): ...
  ```
  If it's a new router file, register it in `app/main.py` with `app.include_router(...)`.
- **A new table or column:** change the model in `app/models/` (and import new models in `app/models/__init__.py`), then:
  ```bash
  alembic revision --autogenerate -m "short description"
  alembic upgrade head
  ```
  Open the generated file in `alembic/versions/` and check it before committing. Update [docs/ERD.md](ERD.md) too.
- **New recipes or ingredients:** edit `backend/seed/recipes.json` or `seed/ingredients.json`, then run `python -m app.seed`. Every recipe ingredient must exist in `ingredients.json`; the script tells you what's missing.
- **A new page:** add a component in `frontend/src/pages/` and a route in `src/App.jsx` (wrap it in `ProtectedRoute` if it needs login). Call the API through `axiosClient`, never with a hard-coded URL.

### 9.3 Check your work

- Backend change: `pytest` passes, and add a test in `backend/tests/` for new behaviour.
- New or changed endpoint: add or update the request in the Postman collection.
- Frontend change: `npm run lint` passes and you tried it in the browser.
- README still true? If you changed setup steps, endpoints or pages, update the matching README.

### 9.4 Commit, push and open a pull request

```bash
git add .
git commit -m "Short description of what changed"
git push -u origin your-name/zer-XX-short-description
```

GitHub prints a link to open a pull request. Describe what changed and how you tested it, mention `ZER-XX`, and ask a teammate for review. Deliveries are on Thursdays; Fridays are for code review and testing.

## 10. Everyday commands

Once everything is set up, a normal day is:

| What | Where | Command |
|---|---|---|
| Start the database | `backend/` | `docker compose up -d db` |
| Activate Python | `backend/` | `source .venv/bin/activate` (Windows: `.venv\Scripts\activate`) |
| Apply new migrations after a `git pull` | `backend/` | `alembic upgrade head` |
| Start the API | `backend/` | `uvicorn app.main:app --reload` |
| Install new JS packages after a `git pull` | `frontend/` | `npm install` |
| Start the frontend | `frontend/` | `npm run dev` |
| Stop the database | `backend/` | `docker compose down` (your data is kept) |

## Troubleshooting

| Problem | Fix |
|---|---|
| `/health` returns 503 or `database` isn't `ok` | The `db` container isn't running or `.env` doesn't match. Run `docker compose ps` and `docker compose up -d db`. |
| Port 5432 is already in use | You have another Postgres installed. Set `POSTGRES_PORT=5433` in `.env` and run `docker compose up -d db` again. |
| `alembic` / `uvicorn` / `pytest`: command not found | The virtual environment isn't active. Activate it (step 4.1). |
| Windows: "running scripts is disabled" when activating | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell once. |
| The ingredient suggestions are empty | The seed wasn't loaded. Run `python -m app.seed`. |
| The frontend shows network or CORS errors | The API isn't running on http://localhost:8000, or your frontend runs on a port other than 5173/3000. Add it to `CORS_ORIGINS` in `backend/.env` and restart the API. |
| You keep getting sent back to the login page | Your token expired (after 60 minutes by default). Log in again. |
| `relation ... does not exist` errors after a `git pull` | A teammate added a migration. Run `alembic upgrade head`. |
