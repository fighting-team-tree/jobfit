"""
Database Configuration for Replit PostgreSQL

Async SQLAlchemy setup with asyncpg driver.
"""

from typing import AsyncGenerator, Optional
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Import settings to ensure .env is loaded first
from app.core.config import settings

# Replit PostgreSQL URL from settings
DATABASE_URL = settings.DATABASE_URL

# Convert postgres:// to postgresql+asyncpg:// for async driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode parameter (asyncpg doesn't support it)
if DATABASE_URL and "sslmode" in DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    query_params = parse_qs(parsed.query)
    query_params.pop("sslmode", None)
    new_query = urlencode(query_params, doseq=True)
    DATABASE_URL = urlunparse(parsed._replace(query=new_query))

# Create async engine (only if DATABASE_URL is configured)
engine = None
AsyncSessionLocal = None

if DATABASE_URL:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,  # Set to True for SQL debugging
        pool_pre_ping=True,  # Verify connections before use
    )

    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

# Base class for ORM models
Base = declarative_base()


async def get_db() -> AsyncGenerator[Optional[AsyncSession], None]:
    """
    Dependency for getting async database session.

    Returns None if database is not configured (graceful degradation).

    Usage:
        @router.get("/items")
        async def get_items(db: Optional[AsyncSession] = Depends(get_db)):
            if db is None:
                # Handle no-database case
                ...
    """
    if AsyncSessionLocal is None:
        # Database not configured - return None for graceful degradation
        yield None
        return

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def is_db_configured() -> bool:
    """Check if database is configured."""
    return bool(DATABASE_URL and engine is not None)
