from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parents[1]
_ENV_FILES = [str(_ROOT / ".env"), str(_ROOT / ".env.local")]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILES, env_file_encoding="utf-8", extra="ignore")

    llm_provider: str = "auto"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fast_model: str = "llama-3.1-8b-instant"
    groq_reasoning_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_fast_model: str = "gemini-2.5-flash"
    gemini_reasoning_model: str = "gemini-2.5-pro"

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = ""
    openrouter_fast_model: str = "openai/gpt-4o-mini"
    openrouter_reasoning_model: str = "openai/gpt-4.1"
    openrouter_site_url: str = "http://localhost:3000"
    openrouter_app_name: str = "Kapruka Shopper"

    mcp_server_url: str = "https://mcp.kapruka.com/mcp"
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 3600
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
