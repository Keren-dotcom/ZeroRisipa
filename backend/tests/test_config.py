from app.core.config import Settings


def test_database_url_built_from_parts_by_default(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    s = Settings(_env_file=None, postgres_host="db", postgres_port=5433)
    assert s.database_url == "postgresql+psycopg://zerorisipa:zerorisipa@db:5433/zerorisipa"


def test_database_url_env_wins_and_gets_psycopg_driver(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require")
    s = Settings(_env_file=None)
    assert s.database_url == "postgresql+psycopg://u:p@ep-x.neon.tech/neondb?sslmode=require"


def test_database_url_env_postgres_scheme(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@host:5432/db")
    assert Settings(_env_file=None).database_url == "postgresql+psycopg://u:p@host:5432/db"


def test_cors_origins_from_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://zerorisipa.onrender.com, http://localhost:5173")
    assert Settings(_env_file=None).cors_origin_list == [
        "https://zerorisipa.onrender.com",
        "http://localhost:5173",
    ]
