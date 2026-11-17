# ZeroRisipa

An app that reduces food waste at home and in student dorms: you keep track of your pantry with expiry dates, and the app suggests meals that use up the ingredients expiring first.

University team project (12 weeks, Agile sprints).

## Features

Working now:

- **Accounts**: sign up, log in and log out (JWT).
- **Pantry**: add, edit and delete food with quantity, unit and expiry date. The list is sorted by expiry date, and items that expire within 3 days are highlighted.
- **Food catalogue**: a shared list of common ingredients for autocomplete. If an ingredient isn't in the list, typing its name in the pantry form adds it to your own catalogue, which only you can see.
- **Recipes API**: a predefined recipe database (loaded by the seed script), with list and detail endpoints.

Planned:

- Recipes page in the frontend (the page is still a placeholder).
- Meal suggestions: a meal plan that uses as many soon-to-expire ingredients as possible.
- Deployment.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios |
| Backend | Python, FastAPI, SQLAlchemy 2, Alembic, Pydantic |
| Database | PostgreSQL 16 (Docker for local development) |
| Tests | PyTest (backend), Postman collection (API) |

## Repository structure

```
.
├── backend/    # FastAPI API, database models, migrations, seed data, tests
├── frontend/   # React + Vite single-page app
└── docs/
    ├── ERD.md      # database diagram and design decisions
    └── postman/    # Postman collection and environment for the API
```

## Quick start

You need Python 3.11+, Node.js 20+ and Docker.

1. **Backend** (in a first terminal, from `backend/`):

   ```bash
   cp .env.example .env
   docker compose up -d db
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   python -m app.seed
   uvicorn app.main:app --reload
   ```

   The API runs on http://localhost:8000 (interactive docs at http://localhost:8000/docs).

2. **Frontend** (in a second terminal, from `frontend/`):

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:5173, create an account and start adding food to your pantry.

More details, including every endpoint and common problems, are in [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Tests

- Backend: run `pytest` from `backend/` with the database running.
- API: import the collection from [docs/postman](docs/postman/README.md) and run it.
