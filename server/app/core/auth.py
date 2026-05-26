"""
JWT Auth Dependencies

Extracts and validates JWT tokens for Google OAuth.
"""

import jwt
from app.core.config import settings
from app.models.user import AuthUser, OptionalUser
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
) -> AuthUser:
    """
    Extract authenticated user from JWT token.
    Raises HTTPException 401 if token is invalid or missing.
    In local development, falls back to dev-user-123.
    """
    from app.core.config import settings

    if not credentials:
        if settings.ENVIRONMENT.lower() not in {"production", "prod"} and not settings.TEST_MODE:
            return AuthUser(
                user_id="dev-user-123",
                username="DevUser",
                email="dev@jobfit.local",
                picture=None,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
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
    except Exception as exc:
        if settings.ENVIRONMENT.lower() not in {"production", "prod"} and not settings.TEST_MODE:
            return AuthUser(
                user_id="dev-user-123",
                username="DevUser",
                email="dev@jobfit.local",
                picture=None,
            )
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
) -> OptionalUser:
    """
    Extract user from token if present, otherwise return unauthenticated user.
    In local development, defaults to dev-user-123 as authenticated to ensure persistence.
    """
    from app.core.config import settings

    if not credentials:
        if settings.ENVIRONMENT.lower() not in {"production", "prod"} and not settings.TEST_MODE:
            return OptionalUser(
                user_id="dev-user-123",
                username="DevUser",
                email="dev@jobfit.local",
                is_authenticated=True,
            )
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
    except Exception:  # noqa: S110
        pass

    if settings.ENVIRONMENT.lower() not in {"production", "prod"} and not settings.TEST_MODE:
        return OptionalUser(
            user_id="dev-user-123",
            username="DevUser",
            email="dev@jobfit.local",
            is_authenticated=True,
        )

    return OptionalUser(is_authenticated=False)
