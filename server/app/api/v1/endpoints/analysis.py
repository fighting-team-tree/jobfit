"""
Analysis API Endpoints

Handles resume parsing, GitHub analysis, and gap analysis.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json

from app.services.nvidia_service import nvidia_service
from app.services.resume_parser_service import resume_parser_service

router = APIRouter()


# ============ Request/Response Models ============

class ResumeTextRequest(BaseModel):
    """Request for text-based resume analysis."""
    resume_text: str


class GitHubAnalysisRequest(BaseModel):
    """Request for GitHub repository analysis."""
    repo_url: str
    include_readme: bool = True
    include_languages: bool = True


class GapAnalysisRequest(BaseModel):
    """Request for profile vs JD gap analysis."""
    profile: dict
    jd_text: str


class ResumeAnalysisResponse(BaseModel):
    """Structured resume analysis response."""
    skills: List[str] = []
    experience: List[dict] = []
    education: List[dict] = []
    projects: List[dict] = []
    certifications: List[str] = []
    raw_text: Optional[str] = None
    parse_error: bool = False


class ResumeFileResponse(BaseModel):
    """Response for file-based resume parsing."""
    markdown: str = ""
    structured: Optional[dict] = None
    pages: int = 0
    success: bool = False
    error: Optional[str] = None


class GapAnalysisResponse(BaseModel):
    """Gap analysis response."""
    match_score: int = 0
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    recommendations: List[str] = []
    strengths: List[str] = []
    areas_to_improve: List[str] = []


# ============ API Endpoints ============

@router.get("/")
def read_root():
    """Health check for analysis module."""
    return {"module": "analysis", "status": "healthy"}


@router.post("/resume", response_model=ResumeAnalysisResponse)
async def analyze_resume_text(request: ResumeTextRequest):
    """
    Analyze resume text and extract structured information.
    
    - **resume_text**: Plain text content of the resume
    
    Returns structured resume data including skills, experience, education, etc.
    """
    if not request.resume_text or len(request.resume_text.strip()) < 50:
        raise HTTPException(
            status_code=400, 
            detail="Resume text too short. Please provide at least 50 characters."
        )
    
    try:
        result = await nvidia_service.parse_resume(request.resume_text)
        return ResumeAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/resume/file", response_model=ResumeFileResponse)
async def analyze_resume_file(
    file: UploadFile = File(...),
    extract_structured: bool = True
):
    """
    Upload and analyze a resume file (PDF or image).
    
    - **file**: Resume file (PDF, PNG, JPG supported)
    - **extract_structured**: Whether to extract structured JSON from markdown
    
    Returns parsed markdown and optionally structured JSON.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file extension
    allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
    file_ext = "." + file.filename.split(".")[-1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {allowed_extensions}"
        )
    
    try:
        content = await file.read()
        
        # Parse file using VLM
        parse_result = await resume_parser_service.parse_resume_file(
            file_bytes=content,
            file_extension=file_ext,
            apply_pii_mask=True
        )
        
        if not parse_result["success"]:
            raise HTTPException(
                status_code=500, 
                detail=parse_result.get("error", "Failed to parse resume")
            )
        
        # Optionally extract structured JSON
        structured_data = None
        if extract_structured and parse_result["markdown"]:
            structured_data = await resume_parser_service.parse_to_structured_json(
                parse_result["markdown"]
            )
        
        return ResumeFileResponse(
            markdown=parse_result["markdown"],
            structured=structured_data,
            pages=parse_result["pages"],
            success=True,
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")


@router.post("/github")
async def analyze_github_repo(request: GitHubAnalysisRequest):
    """
    Analyze a GitHub repository to extract skills and code patterns.
    
    - **repo_url**: GitHub repository URL
    
    Returns analysis of tech stack, code style, and identified skills.
    """
    # Basic URL validation
    if "github.com" not in request.repo_url:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    
    try:
        # Extract owner/repo from URL
        parts = request.repo_url.replace("https://", "").replace("http://", "")
        parts = parts.replace("github.com/", "").strip("/")
        
        if "/" not in parts:
            raise HTTPException(status_code=400, detail="Invalid repository URL format")
        
        owner, repo = parts.split("/")[:2]
        
        # TODO: Implement actual GitHub API integration
        # For now, return mock response
        return {
            "repo": f"{owner}/{repo}",
            "languages": ["Python", "JavaScript", "TypeScript"],
            "skills_identified": ["FastAPI", "React", "Docker"],
            "code_quality": "Good",
            "commit_frequency": "Active",
            "note": "Full GitHub analysis coming soon"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GitHub analysis failed: {str(e)}")


@router.post("/gap", response_model=GapAnalysisResponse)
async def analyze_gap(request: GapAnalysisRequest):
    """
    Perform gap analysis between user profile and job description.
    
    - **profile**: Structured user profile (from /analyze/resume)
    - **jd_text**: Job description text
    
    Returns match score, gaps, and recommendations.
    """
    if not request.jd_text or len(request.jd_text.strip()) < 50:
        raise HTTPException(
            status_code=400, 
            detail="JD text too short. Please provide at least 50 characters."
        )
    
    try:
        result = await nvidia_service.analyze_gap(request.profile, request.jd_text)
        return GapAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")
