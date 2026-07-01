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
    groq_stt_model: str = "whisper-large-v3-turbo"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_fast_model: str = "gemini-2.5-flash"
    gemini_reasoning_model: str = "gemini-2.5-pro"

    cloudflare_account_id: str = ""
    cloudflare_api_token: str = ""
    cloudflare_model: str = "@cf/google/gemma-4-26b-a4b-it"
    cloudflare_fast_model: str = "@cf/google/gemma-4-26b-a4b-it"
    cloudflare_reasoning_model: str = "@cf/google/gemma-4-26b-a4b-it"

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = ""
    openrouter_fast_model: str = "google/gemma-4-31b-it:free"
    openrouter_backup_model: str = ""
    openrouter_stt_model: str = "openai/gpt-4o-mini-transcribe"
    openrouter_provider_order: str = ""
    openrouter_provider_allow_fallbacks: bool = True
    # ponytail: use one cheap default unless a deployer explicitly opts into a pricier OpenRouter reasoning model.
    openrouter_reasoning_model: str = "google/gemma-4-31b-it:free"
    openrouter_site_url: str = "http://localhost:3000"
    openrouter_app_name: str = "Kapruka Shopper"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    elevenlabs_tamil_voice_id: str = ""
    elevenlabs_model: str = "eleven_multilingual_v2"

    mcp_server_url: str = "https://mcp.kapruka.com/mcp"
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 3600
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    rate_limit_requests_per_window: int = 20
    rate_limit_window_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str:
        return r"^https://[a-zA-Z0-9-]+(?:-[a-zA-Z0-9-]+)*\.vercel\.app$|^http://localhost:\d+$|^http://127\.0\.0\.1:\d+$"

    @property
    def openrouter_provider_order_list(self) -> list[str]:
        return [provider.strip() for provider in self.openrouter_provider_order.split(",") if provider.strip()]

    @property
    def cloudflare_base_url(self) -> str:
        return f"https://api.cloudflare.com/client/v4/accounts/{self.cloudflare_account_id}/ai/v1"

    @property
    def cloudflare_enabled(self) -> bool:
        return bool(self.cloudflare_account_id and self.cloudflare_api_token)

    @property
    def elevenlabs_enabled(self) -> bool:
        return bool(self.elevenlabs_api_key and self.elevenlabs_voice_id)

    @property
    def openrouter_stt_enabled(self) -> bool:
        return bool(self.openrouter_api_key and self.openrouter_stt_model)

    @property
    def groq_stt_enabled(self) -> bool:
        return bool(self.groq_api_key and self.groq_stt_model)


settings = Settings()
