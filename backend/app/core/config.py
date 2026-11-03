from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Full connection URL (e.g. from Neon or Render). When set, it wins over the POSTGRES_* values.
    database_url_env: str | None = Field(default=None, validation_alias="DATABASE_URL")

    postgres_user: str = "zerorisipa"
    postgres_password: str = "zerorisipa"
    postgres_db: str = "zerorisipa"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    app_env: str = "dev"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Change the key in .env outside local development (e.g. `openssl rand -hex 32`).
    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    @property
    def database_url(self) -> str:
        if self.database_url_env:
            url = self.database_url_env.strip()
            # Hosting providers hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the psycopg driver.
            for prefix in ("postgres://", "postgresql://"):
                if url.startswith(prefix):
                    return "postgresql+psycopg://" + url[len(prefix):]
            return url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
