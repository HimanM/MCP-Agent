import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    groq_api_key: str = ""
    llm_provider: str = "groq"
    groq_model: str = "llama-3.3-70b-versatile"
    gemini_model: str = "gemini-2.5-flash"
    redis_url: str = "redis://localhost:6379"
    mcp_server_url: str = "https://mcp.kapruka.com/mcp"
    session_ttl_seconds: int = 3600
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
