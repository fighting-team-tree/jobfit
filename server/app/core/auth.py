"""
Replit Auth Dependencies

Extracts user information from Replit Auth headers.
"""

from app.models.user import OptionalUser, ReplitUser
from fastapi import HTTPException, Request, status


async def get_current_user(request: Request) -> ReplitUser:
    """
    Extract authenticated user from Replit headers.

    Replit automatically injects these headers when user is logged in:
    - X-Replit-User-Id
    - X-Replit-User-Name
    - X-Replit-User-Roles (optional)

    Raises:
        HTTPException 401 if user is not authenticated.
    """
    user_id = request.headers.get("X-Replit-User-Id")
    username = request.headers.get("X-Replit-User-Name")

    if not user_id or not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with Replit.",
            headers={"WWW-Authenticate": "Replit"},
        )

    roles = request.headers.get("X-Replit-User-Roles")

    return ReplitUser(
        user_id=user_id,
        username=username,
        roles=roles,
    )


async def get_optional_user(request: Request) -> OptionalUser:
    """
    Extract user from Replit headers if present, otherwise return unauthenticated user.

    Use this for endpoints that work with or without authentication.
    """
    user_id = request.headers.get("X-Replit-User-Id")
    username = request.headers.get("X-Replit-User-Name")

    if user_id and username:
        return OptionalUser(
            user_id=user_id,
            username=username,
            is_authenticated=True,
        )

    return OptionalUser(is_authenticated=False)
