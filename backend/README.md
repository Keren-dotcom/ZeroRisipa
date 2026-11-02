# ZeroRisipa – Backend

API-ul aplicației ZeroRisipa: Python + FastAPI, PostgreSQL, SQLAlchemy 2 și Alembic pentru migrații.

## Structură

```
backend/
├── app/
│   ├── main.py          # aplicația FastAPI (CORS, routere)
│   ├── core/config.py   # setări citite din .env
│   ├── db/              # engine, sesiune, Base pentru modele
│   ├── models/          # modele SQLAlchemy (tabele)
│   ├── schemas/         # scheme Pydantic (request/response)
│   ├── routers/         # endpoint-uri, câte un fișier pe resursă
│   └── services/        # logica de business
├── alembic/             # migrații
├── tests/               # teste PyTest
├── docker-compose.yml   # PostgreSQL local
└── .env.example         # model pentru .env
```

## Baza de date

Tabele: `users`, `ingredients`, `pantry_items`, `recipes`, `recipe_ingredients`. Diagrama ERD și deciziile de design sunt în [docs/ERD.md](../docs/ERD.md).

## Cerințe

- Python 3.11+
- Docker + Docker Compose (pentru PostgreSQL)

## Pornire locală

Toate comenzile se rulează din folderul `backend/`.

1. **Configurare**

   ```bash
   cp .env.example .env
   ```

   `.env` nu se pune în repo. Valorile implicite merg pentru dezvoltare locală.

2. **Pornește PostgreSQL**

   ```bash
   docker compose up -d db
   ```

3. **Mediu virtual și dependențe**

   ```bash
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Migrații**

   ```bash
   alembic upgrade head
   ```

5. **Pornește API-ul**

   ```bash
   uvicorn app.main:app --reload
   ```

   - Documentație interactivă: http://localhost:8000/docs
   - Verificare: http://localhost:8000/health trebuie să răspundă `{"status": "ok", "database": "ok"}`

## Autentificare

| Endpoint | Ce face |
|---|---|
| `POST /auth/register` | creează cont: `{"email", "password", "full_name"?}`; parola are minim 8 caractere și se salvează hash-uită cu bcrypt |
| `POST /auth/login` | `{"email", "password"}` → `{"access_token", "token_type": "bearer"}` |
| `GET /auth/me` | datele utilizatorului logat; cere header `Authorization: Bearer <token>` |

Ca să protejezi un endpoint nou, adaugă dependency-ul `get_current_user`:

```python
from app.core.deps import get_current_user
from app.models import User

@router.get("/pantry")
def list_pantry(user: User = Depends(get_current_user)): ...
```

În http://localhost:8000/docs: apelează `/auth/login`, copiază `access_token`, apasă **Authorize** și lipește tokenul.

Tokenul expiră după `ACCESS_TOKEN_EXPIRE_MINUTES` (implicit 60). Cheia de semnare e `JWT_SECRET_KEY` din `.env`.

## Migrații noi

După ce adaugi sau modifici un model în `app/models/` (și îl imporți în `app/models/__init__.py`):

```bash
alembic revision --autogenerate -m "descriere scurta"
alembic upgrade head
```

Verifică fișierul generat în `alembic/versions/` înainte de commit.

## Teste

Cu baza de date pornită:

```bash
pytest
```

## Probleme frecvente

- **Portul 5432 e ocupat** (ai deja Postgres instalat): schimbă `POSTGRES_PORT` în `.env`, de exemplu `5433`, apoi `docker compose up -d db` din nou.
- **`/health` returnează 503**: containerul `db` nu rulează sau datele din `.env` nu se potrivesc. Verifică cu `docker compose ps`.
