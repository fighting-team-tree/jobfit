"""
JWT Auth Dependencies

Extracts and validates JWT tokens for Google OAuth.
"""

from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.models.user import AuthUser, OptionalUser

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """
    Extract authenticated user from JWT token.
    Raises HTTPException 401 if token is invalid or missing.
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    user_id = payload.get("sub")
    username = payload.get("username")
    email = payload.get("email")
    picture = payload.get("picture")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return AuthUser(
        user_id=user_id,
        username=username or "Unknown",
        email=email,
        picture=picture,
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security)
) -> OptionalUser:
    """
    Extract user from token if present, otherwise return unauthenticated user.
    """
    if not credentials:
        return OptionalUser(is_authenticated=False)
        
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        user_id = payload.get("sub")
        username = payload.get("username")
        email = payload.get("email")
        
        if user_id:
            return OptionalUser(
                user_id=user_id,
                username=username,
                email=email,
                is_authenticated=True,
            )
    except HTTPException:
        pass
        
    return OptionalUser(is_authenticated=False)
