"""
Profile API Endpoints

User profile CRUD operations with server-side persistence.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_optional_user
from app.models.user import ReplitUser, OptionalUser
from app.models.db_models import UserProfile, User
from app.services.user_service import get_or_create_user

router = APIRouter()


# ============ In-Memory Fallback Storage ============
profiles_store: dict = {}


# ============ Request/Response Models ============

class ProfileSaveRequest(BaseModel):
    """Request body for saving profile data."""
    profile_data: Optional[dict] = None
    resume_file_result: Optional[dict] = None
    github_analysis: Optional[dict] = None
    gap_analysis: Optional[dict] = None
    jd_text: Optional[str] = None
    github_url: Optional[str] = None


class ProfileResponse(BaseModel):
    """Response for profile data."""
    user_id: str
    profile_data: Optional[dict] = None
    resume_file_result: Optional[dict] = None
    github_analysis: Optional[dict] = None
    gap_analysis: Optional[dict] = None
    jd_text: Optional[str] = None
    github_url: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Helper Functions ============

def use_database(db: Optional[AsyncSession], user: OptionalUser) -> bool:
    """Check if we should use database mode."""
    return db is not None and user.is_authenticated


def profile_model_to_response(profile: UserProfile, user_id: str) -> ProfileResponse:
    """Convert SQLAlchemy model to Pydantic response."""
    return ProfileResponse(
        user_id=user_id,
        profile_data=profile.profile_data,
        resume_file_result=profile.resume_file_result,
        github_analysis=profile.github_analysis,
        gap_analysis=profile.gap_analysis,
        jd_text=profile.jd_text,
        github_url=profile.github_url,
    )


def profile_dict_to_response(profile: dict, user_id: str) -> ProfileResponse:
    """Convert dict (in-memory) to Pydantic response."""
    return ProfileResponse(
        user_id=user_id,
        profile_data=profile.get("profile_data"),
        resume_file_result=profile.get("resume_file_result"),
        github_analysis=profile.get("github_analysis"),
        gap_analysis=profile.get("gap_analysis"),
        jd_text=profile.get("jd_text"),
        github_url=profile.get("github_url"),
    )


# ============ Endpoints ============

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    user: OptionalUser = Depends(get_optional_user),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """
    Get current user's profile data.

    - Authenticated: Returns user's profile from database
    - Unauthenticated: Returns in-memory profile (demo mode)
    """
    # Database mode
    if use_database(db, user):
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user.user_id)
        )
        user_profile = result.scalar_one_or_none()

        if not user_profile:
            # Return empty profile if not exists
            return ProfileResponse(
                user_id=user.user_id,
                profile_data=None,
                resume_file_result=None,
                github_analysis=None,
                gap_analysis=None,
                jd_text=None,
                github_url=None
            )

        return profile_model_to_response(user_profile, user.user_id)

    # Fallback: In-memory mode
    user_id = user.user_id if user.is_authenticated else "anonymous"
    profile = profiles_store.get(user_id, {})
    return profile_dict_to_response(profile, user_id)


@router.put("/me", response_model=ProfileResponse)
async def save_my_profile(
    data: ProfileSaveRequest,
    user: OptionalUser = Depends(get_optional_user),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """
    Save or update current user's profile data.

    - Authenticated: Saves to database
    - Unauthenticated: Saves to in-memory storage (demo mode)
    """
    # Database mode
    if use_database(db, user):
        # Ensure user exists in DB
        replit_user = ReplitUser(user_id=user.user_id, username=user.username)
        await get_or_create_user(db, replit_user)

        # Get or create profile
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user.user_id)
        )
        user_profile = result.scalar_one_or_none()

        if not user_profile:
            user_profile = UserProfile(user_id=user.user_id)
            db.add(user_profile)

        # Update fields (only if provided)
        if data.profile_data is not None:
            user_profile.profile_data = data.profile_data
        if data.resume_file_result is not None:
            user_profile.resume_file_result = data.resume_file_result
        if data.github_analysis is not None:
            user_profile.github_analysis = data.github_analysis
        if data.gap_analysis is not None:
            user_profile.gap_analysis = data.gap_analysis
        if data.jd_text is not None:
            user_profile.jd_text = data.jd_text
        if data.github_url is not None:
            user_profile.github_url = data.github_url

        await db.commit()
        await db.refresh(user_profile)

        return profile_model_to_response(user_profile, user.user_id)

    # Fallback: In-memory mode
    user_id = user.user_id if user.is_authenticated else "anonymous"

    if user_id not in profiles_store:
        profiles_store[user_id] = {}

    profile = profiles_store[user_id]

    # Update fields (only if provided)
    if data.profile_data is not None:
        profile["profile_data"] = data.profile_data
    if data.resume_file_result is not None:
        profile["resume_file_result"] = data.resume_file_result
    if data.github_analysis is not None:
        profile["github_analysis"] = data.github_analysis
    if data.gap_analysis is not None:
        profile["gap_analysis"] = data.gap_analysis
    if data.jd_text is not None:
        profile["jd_text"] = data.jd_text
    if data.github_url is not None:
        profile["github_url"] = data.github_url

    return profile_dict_to_response(profile, user_id)
