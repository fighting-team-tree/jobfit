"""
Auth API Endpoints

Handles Google OAuth and JWT authentication status.
"""

from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
import jwt
from app.core.auth import get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import User
from app.models.user import OptionalUser
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

router = APIRouter()

GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"


class AuthStatusResponse(BaseModel):
    """Response for auth status check."""

    authenticated: bool
    user_id: str | None = None
    username: str | None = None
    email: str | None = None


def create_access_token(data: dict) -> str:
    """Create JWT token."""
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


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
            email=user.email,
        )

    return AuthStatusResponse(authenticated=False)


@router.get("/login/google")
async def login_google():
    """
    Redirects the user to the Google OAuth2 consent screen.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth configuration is missing.",
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_DISCOVERY_URL)
        discovery = response.json()
        auth_endpoint = discovery.get("authorization_endpoint")

    scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.events",
    ]

    query = urlencode(
        {
            "response_type": "code",
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "scope": " ".join(scopes),
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    auth_url = f"{auth_endpoint}?{query}"

    return RedirectResponse(url=auth_url)


@router.get("/callback/google")
async def auth_google_callback(
    code: str,
    db: AsyncSession | None = Depends(get_db),
):
    """
    Handles the Google OAuth2 callback.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="OAuth credentials not set")

    async with httpx.AsyncClient() as client:
        # Get token endpoint
        discovery_response = await client.get(GOOGLE_DISCOVERY_URL)
        token_endpoint = discovery_response.json().get("token_endpoint")

        # Exchange code for token
        token_response = await client.post(
            token_endpoint,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_response.raise_for_status()

        token_data = token_response.json()

        if "error" in token_data:
            raise HTTPException(
                status_code=400,
                detail=f"OAuth Error: {token_data.get('error_description')}",
            )

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        if not access_token:
            raise HTTPException(status_code=400, detail="OAuth access token missing")

        # Get user info
        user_info_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info_response.raise_for_status()

        user_info = user_info_response.json()

    google_user_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    if not google_user_id:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    # DB Sync if DB is configured
    if db:
        query = select(User).where(User.id == google_user_id)
        result = await db.execute(query)
        db_user = result.scalar_one_or_none()

        if not db_user:
            db_user = User(
                id=google_user_id,
                username=name or (email.split("@")[0] if email else "Google User"),
                google_access_token=access_token,
                google_refresh_token=refresh_token,
                google_token_expires_at=datetime.now(UTC) + timedelta(seconds=int(expires_in))
                if expires_in
                else None,
            )
            db.add(db_user)
        else:
            db_user.username = name or db_user.username
            db_user.google_access_token = access_token
            if refresh_token:
                db_user.google_refresh_token = refresh_token
            if expires_in:
                db_user.google_token_expires_at = datetime.now(UTC) + timedelta(
                    seconds=int(expires_in)
                )

        await db.commit()

    # Create our own JWT token
    jwt_payload = {
        "sub": google_user_id,
        "email": email,
        "username": name,
        "picture": picture,
    }

    our_token = create_access_token(jwt_payload)

    return {"access_token": our_token, "token_type": "bearer", "user": jwt_payload}


@router.post("/test-login")
async def test_login(
    db: AsyncSession | None = Depends(get_db),
):
    """
    [DEVELOPMENT ONLY] Returns a valid JWT token for a local test user.
    Creates the test user in the database if they don't exist.
    """
    if settings.ENVIRONMENT.lower() in {"production", "prod"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test login is disabled in production.",
        )

    test_user_id = "dev-user-123"
    test_username = "DevUser"
    test_email = "dev-user@example.com"

    # DB Sync if DB is configured
    if db:
        query = select(User).where(User.id == test_user_id)
        result = await db.execute(query)
        db_user = result.scalar_one_or_none()

        if not db_user:
            db_user = User(
                id=test_user_id,
                username=test_username,
            )
            db.add(db_user)
            await db.commit()

    # Create our own JWT token
    jwt_payload = {
        "sub": test_user_id,
        "email": test_email,
        "username": test_username,
        "picture": None,
    }

    our_token = create_access_token(jwt_payload)

    return {"access_token": our_token, "token_type": "bearer", "user": jwt_payload}
