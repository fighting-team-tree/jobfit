"""
Companies API Endpoints

Manages company tabs with JD input and matching analysis.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
import uuid

router = APIRouter()


# ============ In-Memory Storage (for demo) ============
# In production, use a database

companies_store: dict = {}


# ============ Request/Response Models ============


class CompanyCreate(BaseModel):
    """Request to create a new company."""
    name: str
    jd_text: Optional[str] = None
    jd_url: Optional[str] = None


class CompanyUpdate(BaseModel):
    """Request to update a company."""
    name: Optional[str] = None
    jd_text: Optional[str] = None
    jd_url: Optional[str] = None


class MatchResultResponse(BaseModel):
    """Match analysis result."""
    match_score: float = 0
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    strengths: List[str] = []
    recommendations: List[str] = []
    jd_analysis: Optional[dict] = None
    score_breakdown: Optional[dict] = None


class CompanyResponse(BaseModel):
    """Company response model."""
    id: str
    name: str
    jd_text: Optional[str] = None
    jd_url: Optional[str] = None
    status: Literal["pending", "analyzing", "analyzed", "high_match", "error"] = "pending"
    match_result: Optional[MatchResultResponse] = None
    created_at: str
    updated_at: str
    error_message: Optional[str] = None


class ProfileForAnalysis(BaseModel):
    """User profile for analysis."""
    skills: List[str] = []
    experience: List[dict] = []
    education: List[dict] = []
    projects: List[dict] = []
    certifications: List[str] = []


class AnalyzeRequest(BaseModel):
    """Request to analyze company match."""
    profile: ProfileForAnalysis


# ============ API Endpoints ============


@router.get("/")
def list_companies() -> List[CompanyResponse]:
    """Get all companies."""
    return [CompanyResponse(**c) for c in companies_store.values()]


@router.post("/", response_model=CompanyResponse)
def create_company(request: CompanyCreate) -> CompanyResponse:
    """
    Create a new company for job matching.
    
    - **name**: Company name
    - **jd_text**: Job description text (optional)
    - **jd_url**: Job posting URL (optional)
    """
    company_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    
    company = {
        "id": company_id,
        "name": request.name,
        "jd_text": request.jd_text,
        "jd_url": request.jd_url,
        "status": "pending" if not request.jd_text else "pending",
        "match_result": None,
        "created_at": now,
        "updated_at": now,
        "error_message": None,
    }
    
    companies_store[company_id] = company
    return CompanyResponse(**company)


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: str) -> CompanyResponse:
    """Get a specific company by ID."""
    if company_id not in companies_store:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(**companies_store[company_id])


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: str, request: CompanyUpdate) -> CompanyResponse:
    """
    Update a company's details.
    
    - **name**: New company name
    - **jd_text**: Updated job description
    - **jd_url**: Updated job posting URL
    """
    if company_id not in companies_store:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = companies_store[company_id]
    
    if request.name is not None:
        company["name"] = request.name
    if request.jd_text is not None:
        company["jd_text"] = request.jd_text
        # Reset status when JD is updated
        company["status"] = "pending"
        company["match_result"] = None
    if request.jd_url is not None:
        company["jd_url"] = request.jd_url
    
    company["updated_at"] = datetime.now().isoformat()
    
    return CompanyResponse(**company)


@router.delete("/{company_id}")
def delete_company(company_id: str):
    """Delete a company."""
    if company_id not in companies_store:
        raise HTTPException(status_code=404, detail="Company not found")
    
    del companies_store[company_id]
    return {"message": "Company deleted successfully"}


@router.post("/{company_id}/analyze", response_model=CompanyResponse)
async def analyze_company_match(company_id: str, request: AnalyzeRequest) -> CompanyResponse:
    """
    Analyze job match for a company using Claude Agent.
    
    - **profile**: User's profile data (skills, experience, etc.)
    
    This endpoint triggers the LangGraph-based matching agent to:
    1. Analyze the job description
    2. Match skills with requirements
    3. Calculate match score
    4. Generate recommendations
    """
    if company_id not in companies_store:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = companies_store[company_id]
    
    if not company.get("jd_text"):
        raise HTTPException(
            status_code=400, 
            detail="Job description is required. Please add JD text first."
        )
    
    # Update status to analyzing
    company["status"] = "analyzing"
    company["updated_at"] = datetime.now().isoformat()
    
    try:
        # Import agent here to avoid circular imports and handle missing API key gracefully
        from app.agents.matching_agent import get_job_matching_agent
        
        agent = get_job_matching_agent()
        result = await agent.analyze(
            profile=request.profile.model_dump(),
            jd_text=company["jd_text"]
        )
        
        # Update company with results
        company["match_result"] = {
            "match_score": result.match_score,
            "matching_skills": result.matching_skills,
            "missing_skills": result.missing_skills,
            "strengths": result.strengths,
            "recommendations": result.recommendations,
            "jd_analysis": result.jd_analysis,
            "score_breakdown": result.score_breakdown,
        }
        
        # Set status based on match score
        if result.match_score >= 70:
            company["status"] = "high_match"
        else:
            company["status"] = "analyzed"
        
        company["error_message"] = None
        
    except ValueError as e:
        company["status"] = "error"
        company["error_message"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        company["status"] = "error"
        company["error_message"] = f"Analysis failed: {str(e)}"
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        company["updated_at"] = datetime.now().isoformat()
    
    return CompanyResponse(**company)


@router.post("/{company_id}/scrape-jd")
async def scrape_company_jd(company_id: str) -> CompanyResponse:
    """
    Scrape job description from the company's JD URL.
    
    Requires jd_url to be set first.
    """
    if company_id not in companies_store:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = companies_store[company_id]
    
    if not company.get("jd_url"):
        raise HTTPException(
            status_code=400,
            detail="JD URL is required. Please add the job posting URL first."
        )
    
    try:
        from app.services.jd_scraper_service import jd_scraper_service
        
        result = await jd_scraper_service.scrape_jd_from_url(company["jd_url"])
        
        if result.get("success"):
            company["jd_text"] = result.get("raw_text", "")
            company["status"] = "pending"
            company["updated_at"] = datetime.now().isoformat()
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to scrape JD")
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")
    
    return CompanyResponse(**company)
