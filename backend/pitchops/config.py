"""Centralised configuration — reads env vars once, validated at startup.

All application code should import `get_settings()` rather than reading
`os.environ` directly. This makes every dependency on configuration explicit
and injectable during testing.
"""

from __future__ import annotations

import asyncio
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env relative to this file's parent (backend/)
_ENV_FILE = Path(__file__).parent.parent / ".env"
load_dotenv(_ENV_FILE)


class Settings(BaseSettings):
    """Application settings resolved from environment variables.

    All fields have type annotations so Pydantic validates them on startup.
    Missing required fields raise a clear ``ValidationError`` rather than a
    cryptic ``KeyError`` deep inside request handlers.
    """

    mongo_url: str = ""
    db_name: str = ""
    google_api_key: str = ""
    llm_model: str = "gemini-2.0-flash"
    cors_origins: str = "*"
    llm_concurrency: int = 4

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def _require_db_fields(self) -> "Settings":
        """Raise at startup if critical DB settings are missing."""
        if not self.mongo_url:
            raise ValueError("MONGO_URL environment variable is required but not set.")
        if not self.db_name:
            raise ValueError("DB_NAME environment variable is required but not set.")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list, splitting on commas."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_semaphore(self) -> asyncio.Semaphore:
        """Return a new semaphore capped to ``llm_concurrency``.

        Each call returns a *new* semaphore so callers that cache it own it.
        The main app should cache this at startup.
        """
        return asyncio.Semaphore(self.llm_concurrency)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton ``Settings`` instance (cached after first call)."""
    return Settings()
