"""
Database Initialization

Creates tables on startup if they don't exist.
"""

from app.core.database import Base, engine, is_db_configured

# Import all models to register them with Base
from app.models.db_models import Company, InterviewSession, Roadmap, User, UserProfile  # noqa: F401

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

        # Seed test user in development mode
        from app.core.config import settings
        from app.core.database import AsyncSessionLocal
        from app.models.db_models import User
        from sqlalchemy.future import select

        if (
            settings.ENVIRONMENT.lower() not in {"production", "prod"}
            and AsyncSessionLocal is not None
        ):
            async with AsyncSessionLocal() as session:
                try:
                    # Check if test user exists
                    query = select(User).where(User.id == "dev-user-123")
                    result = await session.execute(query)
                    db_user = result.scalar_one_or_none()
                    if not db_user:
                        test_user = User(id="dev-user-123", username="DevUser")
                        session.add(test_user)
                        await session.commit()
                        print("👥 Seeded local test user (dev-user-123) successfully.")
                except Exception as seed_err:
                    print(f"⚠️ Failed to seed test user: {seed_err}")
    except Exception as e:
        # Don't crash the server if DB connection fails
        # This allows running locally without DB access
        print(f"⚠️  Database connection failed: {e}")
        print("   Running in fallback mode (in-memory storage).")
