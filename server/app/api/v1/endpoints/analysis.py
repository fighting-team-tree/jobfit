"""
Analysis API Endpoints

Handles resume parsing, GitHub analysis, and gap analysis.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json

from app.services.nvidia_service import nvidia_service

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


@router.post("/resume/file", response_model=ResumeAnalysisResponse)
async def analyze_resume_file(file: UploadFile = File(...)):
    """
    Upload and analyze a resume file (PDF or TXT).
    
    - **file**: Resume file (PDF, TXT supported)
    
    Returns structured resume data.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file extension
    allowed_extensions = [".pdf", ".txt", ".md"]
    file_ext = "." + file.filename.split(".")[-1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {allowed_extensions}"
        )
    
    try:
        content = await file.read()
        
        if file_ext == ".pdf":
            # For PDF, we'd need a PDF parser - for now, return error
            # In production, use pdfplumber or PyPDF2
            raise HTTPException(
                status_code=501, 
                detail="PDF parsing not yet implemented. Please paste text directly."
            )
        else:
            # Text file
            resume_text = content.decode("utf-8")
        
        result = await nvidia_service.parse_resume(resume_text)
        return ResumeAnalysisResponse(**result)
        
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
