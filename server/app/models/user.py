"""
Replit Auth User Models

Pydantic models for Replit authentication.
"""

from pydantic import BaseModel


class ReplitUser(BaseModel):
    """Authenticated Replit user."""

    user_id: str
    username: str
    roles: str | None = None


class OptionalUser(BaseModel):
    """Optional user for endpoints that work with or without auth."""

    user_id: str | None = None
    username: str | None = None
    is_authenticated: bool = False
