"""
Database Initialization

Creates tables on startup if they don't exist.
"""

from app.core.database import engine, Base, is_db_configured

# Import all models to register them with Base
from app.models.db_models import User, Company, Roadmap, InterviewSession  # noqa: F401

_initialized = False


async def init_db():
    """
    Initialize database by creating all tables.

    Called once during application startup.
    """
    global _initialized

    if _initialized:
        return

    if not is_db_configured():
        print("⚠️  DATABASE_URL not configured. Running without database.")
        return

    try:
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables initialized successfully.")
        _initialized = True
    except Exception as e:
        # Don't crash the server if DB connection fails
        # This allows running locally without DB access
        print(f"⚠️  Database connection failed: {e}")
        print("   Running in fallback mode (in-memory storage).")
