import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the project root directory (.env is at project root)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "JobFit"
    API_V1_STR: str = "/api/v1"

    # CORS - includes Replit domains
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://0.0.0.0:5173",
        "https://*.replit.dev",
        "https://*.repl.co",
    ]

    # Provider 선택: "gemini" | "openai"
    LLM_PROVIDER: str = "gemini"
    TEST_MODE: bool = False

    # AI Keys
    NVIDIA_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_AGENT_ID: str = ""
    DEEPGRAM_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # 모델명 override (비어있으면 provider 기본값 사용)
    LLM_MODEL: str = ""
    EMBEDDING_MODEL: str = ""

    # GitHub API
    GITHUB_TOKEN: str = ""

    # Database (Replit PostgreSQL)
    DATABASE_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Add Replit domain to CORS if running on Replit
        replit_slug = os.environ.get("REPL_SLUG")
        replit_owner = os.environ.get("REPL_OWNER")
        if replit_slug and replit_owner:
            replit_domain = f"https://{replit_slug}.{replit_owner}.repl.co"
            if replit_domain not in self.BACKEND_CORS_ORIGINS:
                self.BACKEND_CORS_ORIGINS.append(replit_domain)


settings = Settings()
