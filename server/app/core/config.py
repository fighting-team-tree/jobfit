import os
import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the project root directory (.env is at project root)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "JobFit"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS - exact origins (wildcard patterns don't work in FastAPI CORSMiddleware)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://0.0.0.0:5173",
    ]
    # Regex for dynamic Replit subdomains
    CORS_ORIGIN_REGEX: str = r"https://.*\.(replit\.dev|replit\.app|repl\.co)"

    # Provider 선택: "gemini" | "openai" | "upstage"
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
    UPSTAGE_API_KEY: str = ""

    # 모델명 override (비어있으면 provider 기본값 사용)
    LLM_PARSE_MODEL: str = ""
    LLM_ANALYSIS_MODEL: str = ""
    LLM_VISION_MODEL: str = ""
    EMBEDDING_MODEL: str = ""

    # GitHub API
    GITHUB_TOKEN: str = ""

    # Database (Replit PostgreSQL / Local SQLite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./jobfit.db"

    # Auth & JWT
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/auth/callback/google"

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.JWT_SECRET_KEY:
            if self.ENVIRONMENT.lower() in {"production", "prod"}:
                raise ValueError("JWT_SECRET_KEY must be set in production")
            self.JWT_SECRET_KEY = secrets.token_urlsafe(32)

        # Add Replit domain to CORS if running on Replit
        replit_slug = os.environ.get("REPL_SLUG")
        replit_owner = os.environ.get("REPL_OWNER")
        if replit_slug and replit_owner:
            replit_domain = f"https://{replit_slug}.{replit_owner}.repl.co"
            if replit_domain not in self.BACKEND_CORS_ORIGINS:
                self.BACKEND_CORS_ORIGINS.append(replit_domain)


settings = Settings()
