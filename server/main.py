from contextlib import asynccontextmanager
from pathlib import Path

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.init_db import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Frontend 빌드 경로
FRONTEND_BUILD_DIR = Path(__file__).parent.parent / "client" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


# Frontend 정적 파일 서빙 (Replit 배포용)
if FRONTEND_BUILD_DIR.exists():
    # 정적 파일 (JS, CSS, 이미지 등)
    assets_dir = FRONTEND_BUILD_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # 루트 경로
    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_BUILD_DIR / "index.html")

    # SPA 라우팅: 모든 경로를 index.html로
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 경로는 제외 (이미 위에서 라우팅됨)
        if full_path.startswith("api/"):
            return {"error": "Not found"}

        # 정적 파일이 존재하면 해당 파일 반환
        file_path = FRONTEND_BUILD_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # 그 외는 index.html 반환 (SPA 라우팅)
        return FileResponse(FRONTEND_BUILD_DIR / "index.html")
else:

    @app.get("/")
    def root():
        return {"message": "Welcome to JobFit API", "docs": "/docs"}
