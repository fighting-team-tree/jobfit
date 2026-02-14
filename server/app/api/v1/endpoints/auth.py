"""
Auth API Endpoints

Handles Replit authentication status.
"""

from app.core.auth import get_optional_user
from app.models.user import OptionalUser
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter()


class AuthStatusResponse(BaseModel):
    """Response for auth status check."""

    authenticated: bool
    user_id: str | None = None
    username: str | None = None


@router.get("/me", response_model=AuthStatusResponse)
async def get_current_user_info(
    user: OptionalUser = Depends(get_optional_user),
) -> AuthStatusResponse:
    """
    Get current user information.

    Returns authenticated status and user info if logged in.
    Works without authentication (returns authenticated: false).
    """
    if user.is_authenticated:
        return AuthStatusResponse(
            authenticated=True,
            user_id=user.user_id,
            username=user.username,
        )

    return AuthStatusResponse(authenticated=False)
