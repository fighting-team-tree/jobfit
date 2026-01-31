"""
Replit Auth User Models

Pydantic models for Replit authentication.
"""

from pydantic import BaseModel
from typing import Optional


class ReplitUser(BaseModel):
    """Authenticated Replit user."""
    user_id: str
    username: str
    roles: Optional[str] = None


class OptionalUser(BaseModel):
    """Optional user for endpoints that work with or without auth."""
    user_id: Optional[str] = None
    username: Optional[str] = None
    is_authenticated: bool = False
