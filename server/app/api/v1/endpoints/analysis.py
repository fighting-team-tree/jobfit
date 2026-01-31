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
from app.services.jd_scraper_service import jd_scraper_service

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


class JDUrlRequest(BaseModel):
    """Request for JD URL scraping."""
    url: str


class JDScrapedResponse(BaseModel):
    """Response for JD URL scraping."""
    url: str
    title: str = ""
    raw_text: str = ""
    success: bool = False
    error: Optional[str] = None
    method: str = "httpx"


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
    match_score: float = 0  # Changed from int to float
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    recommendations: List[str] = []
    strengths: List[str] = []
    areas_to_improve: List[str] = []
    # New detailed fields (optional)
    jd_analysis: Optional[dict] = None
    profile_skills: Optional[List[str]] = None
    matching_required: Optional[List[str]] = None
    missing_required: Optional[List[str]] = None
    matching_preferred: Optional[List[str]] = None
    missing_preferred: Optional[List[str]] = None
    score_breakdown: Optional[dict] = None


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


@router.post("/jd/url", response_model=JDScrapedResponse)
async def scrape_jd_from_url(request: JDUrlRequest):
    """
    Scrape job description from a URL.
    
    - **url**: URL of the job posting page
    
    Uses httpx + BeautifulSoup first, falls back to Playwright for JS-rendered sites.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        result = await jd_scraper_service.scrape_jd_from_url(request.url)
        return JDScrapedResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

