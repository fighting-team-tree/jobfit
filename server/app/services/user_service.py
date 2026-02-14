"""
User Service

Handles user creation and retrieval in database.
"""

from app.models.db_models import User
from app.models.user import ReplitUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_create_user(db: AsyncSession, replit_user: ReplitUser) -> User:
    """
    Get existing user or create new one from Replit auth.

    Args:
        db: Database session
        replit_user: Authenticated Replit user

    Returns:
        User model instance
    """
    # Try to find existing user
    result = await db.execute(select(User).where(User.id == replit_user.user_id))
    user = result.scalar_one_or_none()

    if user:
        # Update username if changed
        if user.username != replit_user.username:
            user.username = replit_user.username
            await db.commit()
        return user

    # Create new user
    user = User(
        id=replit_user.user_id,
        username=replit_user.username,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user
