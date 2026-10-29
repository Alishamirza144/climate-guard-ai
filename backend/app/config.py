"""Centralised settings — read from backend/.env via pydantic-settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # CORS and security
    frontend_origin: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # NASA FIRMS
    firms_map_key: str = ""

    # Telegram alerts
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Web Push VAPID
    vapid_public_key: str = ""
    vapid_private_key: str = ""

    # IoT gateway
    iot_api_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./climateguard.db"

    # Logging
    log_level: str = "INFO"

    @field_validator("log_level")
    @classmethod
    def _validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return upper


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
