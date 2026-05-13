"""
Auth User Models

Pydantic models for authentication.
"""

from pydantic import BaseModel


class AuthUser(BaseModel):
    """Authenticated user from JWT token."""

    user_id: str
    username: str
    email: str | None = None
    picture: str | None = None


class OptionalUser(BaseModel):
    """Optional user for endpoints that work with or without auth."""

    user_id: str | None = None
    username: str | None = None
    email: str | None = None
    is_authenticated: bool = False
