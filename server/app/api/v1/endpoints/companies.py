"""
Companies API Endpoints

Manages company tabs with JD input and matching analysis.
Now with PostgreSQL database support and Replit authentication.
"""

import uuid
from datetime import datetime
from typing import Literal

from app.core.auth import get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import Company as CompanyModel
from app.models.user import OptionalUser, ReplitUser
from app.services.in_memory_store import ExpiringStore
from app.services.user_service import get_or_create_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# ============ Fallback In-Memory Storage (when DB not configured) ============
companies_store: ExpiringStore[str, dict] = ExpiringStore(
    ttl_seconds=60 * 60 * 6,
    max_size=500,
)


# ============ Request/Response Models ============


class CompanyCreate(BaseModel):
    """Request to create a new company."""

    name: str
    jd_text: str | None = None
    jd_url: str | None = None


class CompanyUpdate(BaseModel):
    """Request to update a company."""

    name: str | None = None
    jd_text: str | None = None
    jd_url: str | None = None


class MatchResultResponse(BaseModel):
    """Match analysis result."""

    match_score: float = 0
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    jd_analysis: dict | None = None
    score_breakdown: dict | None = None


class CompanyResponse(BaseModel):
    """Company response model."""

    id: str
    name: str
    jd_text: str | None = None
    jd_url: str | None = None
    status: Literal["pending", "analyzing", "analyzed", "high_match", "error"] = "pending"
    match_result: MatchResultResponse | None = None
    created_at: str
    updated_at: str | None = None
    error_message: str | None = None


class ProfileForAnalysis(BaseModel):
    """User profile for analysis."""

    skills: list[str] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    """Request to analyze company match."""

    profile: ProfileForAnalysis


# ============ Helper Functions ============


def company_model_to_response(company: CompanyModel) -> CompanyResponse:
    """Convert SQLAlchemy model to Pydantic response."""
    return CompanyResponse(
        id=company.id,
        name=company.name,
        jd_text=company.jd_text,
        jd_url=company.jd_url,
        status=company.status or "pending",
        match_result=company.match_result,
        created_at=company.created_at.isoformat()
        if company.created_at
        else datetime.now().isoformat(),
        updated_at=company.updated_at.isoformat() if company.updated_at else None,
        error_message=company.error_message,
    )


def company_dict_to_response(company: dict) -> CompanyResponse:
    """Convert dict (in-memory) to Pydantic response."""
    return CompanyResponse(**company)


def use_database(db: AsyncSession | None, user: OptionalUser) -> bool:
    """Check if we should use database mode."""
    return db is not None and user.is_authenticated


def get_fallback_user_id(request: Request, user: OptionalUser) -> str:
    """Return an isolated fallback key for non-database demo mode."""
    if settings.ENVIRONMENT.lower() in {"production", "prod"}:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is required for company persistence in production.",
        )
    if user.is_authenticated and user.user_id:
        return user.user_id

    session_id = request.headers.get("x-jobfit-client-session")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client session header is required for demo company storage.",
        )
    return f"demo:{session_id}"


def get_fallback_company(company_id: str, fallback_user_id: str) -> dict:
    """Get a fallback company only if it belongs to the current demo user."""
    company = companies_store.get(company_id)
    if not company or company.get("owner_id") != fallback_user_id:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ============ API Endpoints ============


@router.get("/")
async def list_companies(
    request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
) -> list[CompanyResponse]:
    """
    Get all companies for the current user.

    - Authenticated: Returns user's companies from database
    - Unauthenticated: Returns in-memory companies (demo mode)
    """
    # Database mode
    if use_database(db, user):
        result = await db.execute(
            select(CompanyModel)
            .where(CompanyModel.user_id == user.user_id)
            .order_by(CompanyModel.created_at.desc())
        )
        companies = result.scalars().all()
        return [company_model_to_response(c) for c in companies]

    # Fallback: In-memory mode
    fallback_user_id = get_fallback_user_id(request, user)
    return [
        company_dict_to_response(c)
        for c in companies_store.values()
        if c.get("owner_id") == fallback_user_id
    ]


@router.post("/", response_model=CompanyResponse)
async def create_company(
    request: CompanyCreate,
    http_request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
) -> CompanyResponse:
    """
    Create a new company for job matching.

    - **name**: Company name
    - **jd_text**: Job description text (optional)
    - **jd_url**: Job posting URL (optional)
    """
    company_id = str(uuid.uuid4())[:8]
    now = datetime.now()

    # Database mode
    if use_database(db, user):
        # Ensure user exists in DB
        replit_user = ReplitUser(user_id=user.user_id, username=user.username)
        await get_or_create_user(db, replit_user)

        company = CompanyModel(
            id=company_id,
            user_id=user.user_id,
            name=request.name,
            jd_text=request.jd_text,
            jd_url=request.jd_url,
            status="pending",
        )
        db.add(company)
        await db.commit()
        await db.refresh(company)

        return company_model_to_response(company)

    # Fallback: In-memory mode
    fallback_user_id = get_fallback_user_id(http_request, user)
    company = {
        "id": company_id,
        "owner_id": fallback_user_id,
        "name": request.name,
        "jd_text": request.jd_text,
        "jd_url": request.jd_url,
        "status": "pending",
        "match_result": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "error_message": None,
    }
    companies_store[company_id] = company
    return company_dict_to_response(company)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
) -> CompanyResponse:
    """Get a specific company by ID."""
    # Database mode
    if use_database(db, user):
        result = await db.execute(
            select(CompanyModel).where(
                CompanyModel.id == company_id, CompanyModel.user_id == user.user_id
            )
        )
        company = result.scalar_one_or_none()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        return company_model_to_response(company)

    # Fallback: In-memory mode
    fallback_user_id = get_fallback_user_id(request, user)
    return company_dict_to_response(get_fallback_company(company_id, fallback_user_id))


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    request: CompanyUpdate,
    http_request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
) -> CompanyResponse:
    """
    Update a company's details.

    - **name**: New company name
    - **jd_text**: Updated job description
    - **jd_url**: Updated job posting URL
    """
    # Database mode
    if use_database(db, user):
        result = await db.execute(
            select(CompanyModel).where(
                CompanyModel.id == company_id, CompanyModel.user_id == user.user_id
            )
        )
        company = result.scalar_one_or_none()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        if request.name is not None:
            company.name = request.name
        if request.jd_text is not None:
            company.jd_text = request.jd_text
            company.status = "pending"
            company.match_result = None
        if request.jd_url is not None:
            company.jd_url = request.jd_url

        await db.commit()
        await db.refresh(company)

        return company_model_to_response(company)

    # Fallback: In-memory mode
    fallback_user_id = get_fallback_user_id(http_request, user)
    company = get_fallback_company(company_id, fallback_user_id)

    if request.name is not None:
        company["name"] = request.name
    if request.jd_text is not None:
        company["jd_text"] = request.jd_text
        company["status"] = "pending"
        company["match_result"] = None
    if request.jd_url is not None:
        company["jd_url"] = request.jd_url

    company["updated_at"] = datetime.now().isoformat()

    return company_dict_to_response(company)


@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
):
    """Delete a company."""
    # Database mode
    if use_database(db, user):
        result = await db.execute(
            select(CompanyModel).where(
                CompanyModel.id == company_id, CompanyModel.user_id == user.user_id
            )
        )
        company = result.scalar_one_or_none()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        await db.delete(company)
        await db.commit()

        return {"message": "Company deleted successfully"}

    # Fallback: In-memory mode
    fallback_user_id = get_fallback_user_id(request, user)
    get_fallback_company(company_id, fallback_user_id)
    del companies_store[company_id]
    return {"message": "Company deleted successfully"}


@router.post("/{company_id}/analyze", response_model=CompanyResponse)
async def analyze_company_match(
    company_id: str,
    request: AnalyzeRequest,
    http_request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
) -> CompanyResponse:
    """
    Analyze job match for a company using Claude Agent.

    - **profile**: User's profile data (skills, experience, etc.)

    This endpoint triggers the LangGraph-based matching agent to:
    1. Analyze the job description
    2. Match skills with requirements
    3. Calculate match score
    4. Generate recommendations
    """
    # Get company (DB or in-memory)
    company = None
    company_dict = None

    if use_database(db, user):
        result = await db.execute(
            select(CompanyModel).where(
                CompanyModel.id == company_id, CompanyModel.user_id == user.user_id
            )
        )
        company = result.scalar_one_or_none()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        if not company.jd_text:
            raise HTTPException(
                status_code=400, detail="Job description is required. Please add JD text first."
            )

        # Update status to analyzing
        company.status = "analyzing"
        await db.commit()
    else:
        # In-memory mode
        fallback_user_id = get_fallback_user_id(http_request, user)
        company_dict = get_fallback_company(company_id, fallback_user_id)

        if not company_dict.get("jd_text"):
            raise HTTPException(
                status_code=400, detail="Job description is required. Please add JD text first."
            )

        company_dict["status"] = "analyzing"
        company_dict["updated_at"] = datetime.now().isoformat()

    try:
        # Import agent here to avoid circular imports
        from app.agents.matching_agent import get_job_matching_agent

        agent = get_job_matching_agent()
        jd_text = company.jd_text if company else company_dict["jd_text"]

        result = await agent.analyze(profile=request.profile.model_dump(), jd_text=jd_text)

        match_result = {
            "match_score": result.match_score,
            "matching_skills": result.matching_skills,
            "missing_skills": result.missing_skills,
            "strengths": result.strengths,
            "recommendations": result.recommendations,
            "jd_analysis": result.jd_analysis,
            "score_breakdown": result.score_breakdown,
        }

        # Determine status based on score
        status = "high_match" if result.match_score >= 70 else "analyzed"

        if company:
            company.match_result = match_result
            company.status = status
            company.error_message = None
            await db.commit()
            await db.refresh(company)
            return company_model_to_response(company)
        else:
            company_dict["match_result"] = match_result
            company_dict["status"] = status
            company_dict["error_message"] = None
            company_dict["updated_at"] = datetime.now().isoformat()
            return company_dict_to_response(company_dict)

    except ValueError as e:
        error_msg = str(e)
        if company:
            company.status = "error"
            company.error_message = error_msg
            await db.commit()
        else:
            company_dict["status"] = "error"
            company_dict["error_message"] = error_msg
        raise HTTPException(status_code=500, detail=error_msg) from e

    except Exception as e:
        error_msg = f"Analysis failed: {str(e)}"
        if company:
            company.status = "error"
            company.error_message = error_msg
            await db.commit()
        else:
            company_dict["status"] = "error"
            company_dict["error_message"] = error_msg
        raise HTTPException(status_code=500, detail=error_msg) from e


@router.post("/{company_id}/scrape-jd")
async def scrape_company_jd(
    company_id: str,
    request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
) -> CompanyResponse:
    """
    Scrape job description from the company's JD URL.

    Requires jd_url to be set first.
    """
    # Get company
    company = None
    company_dict = None

    if use_database(db, user):
        result = await db.execute(
            select(CompanyModel).where(
                CompanyModel.id == company_id, CompanyModel.user_id == user.user_id
            )
        )
        company = result.scalar_one_or_none()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        if not company.jd_url:
            raise HTTPException(
                status_code=400, detail="JD URL is required. Please add the job posting URL first."
            )

        jd_url = company.jd_url
    else:
        fallback_user_id = get_fallback_user_id(request, user)
        company_dict = get_fallback_company(company_id, fallback_user_id)

        if not company_dict.get("jd_url"):
            raise HTTPException(
                status_code=400, detail="JD URL is required. Please add the job posting URL first."
            )

        jd_url = company_dict["jd_url"]

    try:
        from app.services.jd_scraper_service import jd_scraper_service

        result = await jd_scraper_service.scrape_jd_from_url(jd_url)

        if result.get("success"):
            jd_text = result.get("raw_text", "")

            if company:
                company.jd_text = jd_text
                company.status = "pending"
                await db.commit()
                await db.refresh(company)
                return company_model_to_response(company)
            else:
                company_dict["jd_text"] = jd_text
                company_dict["status"] = "pending"
                company_dict["updated_at"] = datetime.now().isoformat()
                return company_dict_to_response(company_dict)
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to scrape JD"))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}") from e
