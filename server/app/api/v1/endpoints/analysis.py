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
    GitHub URL을 분석하여 기술 역량을 추출합니다.
    
    - **repo_url**: GitHub URL (리포지토리 또는 사용자 프로필)
      - 리포지토리: https://github.com/owner/repo
      - 사용자 프로필: https://github.com/username
    
    공개 리포지토리만 분석 가능합니다.
    """
    from app.services.github_service import github_service
    
    # URL 유효성 검사
    if "github.com" not in request.repo_url:
        raise HTTPException(status_code=400, detail="잘못된 GitHub URL입니다.")
    
    try:
        # Step 1: GitHub 데이터 조회
        repo_data = await github_service.analyze_repository(request.repo_url)
        
        # Step 2: NVIDIA LLM으로 스킬 추론
        skills_analysis = await nvidia_service.infer_skills_from_github(
            languages=repo_data.get("languages", {}),
            dependencies=repo_data.get("dependencies", {}),
            readme_excerpt=repo_data.get("readme_excerpt"),
            topics=repo_data.get("topics", [])
        )
        
        # 사용자 프로필 vs 리포지토리 응답 구분
        is_user_profile = "username" in repo_data
        
        if is_user_profile:
            return {
                "type": "user_profile",
                "username": repo_data.get("username"),
                "total_repos": repo_data.get("total_repos", 0),
                "repos_analyzed": repo_data.get("repos_analyzed", []),
                "languages": repo_data.get("languages", {}),
                "dependencies": repo_data.get("dependencies", {}),
                "topics": repo_data.get("topics", []),
                # LLM 분석
                "primary_language": skills_analysis.get("primary_language"),
                "frameworks": skills_analysis.get("frameworks", []),
                "skill_level": skills_analysis.get("skill_level"),
                "skills_identified": skills_analysis.get("skills_identified", []),
                "code_patterns": skills_analysis.get("code_patterns", []),
                "summary": skills_analysis.get("summary", "")
            }
        else:
            return {
                "type": "repository",
                "repo": repo_data.get("repo"),
                "description": repo_data.get("description"),
                "stars": repo_data.get("stars", 0),
                "languages": repo_data.get("languages", {}),
                "dependencies": repo_data.get("dependencies", {}),
                "topics": repo_data.get("topics", []),
                # LLM 분석
                "primary_language": skills_analysis.get("primary_language"),
                "frameworks": skills_analysis.get("frameworks", []),
                "skill_level": skills_analysis.get("skill_level"),
                "skills_identified": skills_analysis.get("skills_identified", []),
                "code_patterns": skills_analysis.get("code_patterns", []),
                "summary": skills_analysis.get("summary", "")
            }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if "404" in str(e) or "Not Found" in str(e):
            raise HTTPException(
                status_code=404, 
                detail="리포지토리 또는 사용자를 찾을 수 없습니다. 공개 계정인지 확인해주세요."
            )
        raise HTTPException(status_code=500, detail=f"GitHub 분석 실패: {str(e)}")


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
