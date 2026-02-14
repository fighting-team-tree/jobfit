"""
Analysis API Endpoints

Handles resume parsing, GitHub analysis, and gap analysis.
"""

from typing import Literal

from app.core.config import settings
from app.services.jd_scraper_service import jd_scraper_service
from app.services.llm_service import llm_service
from app.services.resume_parser_service import resume_parser_service
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

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


class JDUrlRequest(BaseModel):
    """Request for JD URL scraping."""

    url: str


class JDScrapedResponse(BaseModel):
    """Response for JD URL scraping."""

    url: str
    title: str = ""
    raw_text: str = ""
    success: bool = False
    error: str | None = None
    method: str = "httpx"


class ProfileContact(BaseModel):
    email: str | None = None
    phone: str | None = None
    github: str | None = None
    blog: str | None = None


class ProfileExperience(BaseModel):
    company: str
    role: str | None = None
    duration: str | None = None
    description: str | None = None


class ProfileEducation(BaseModel):
    school: str
    degree: str | None = None
    major: str | None = None
    year: str | None = None
    gpa: str | None = None


class ProfileProject(BaseModel):
    name: str
    description: str | None = None
    tech_stack: list[str] | None = None
    role: str | None = None


class ProfileStructured(BaseModel):
    name: str | None = None
    contact: ProfileContact | None = None
    skills: list[str] = []
    experience: list[ProfileExperience] = []
    education: list[ProfileEducation] = []
    projects: list[ProfileProject] = []
    certifications: list[str] = []
    awards: list[str] = []


class ResumeAnalysisResponse(ProfileStructured):
    """Structured resume analysis response."""

    raw_text: str | None = None
    parse_error: bool = False


class ResumeFileResponse(BaseModel):
    """Response for file-based resume parsing."""

    markdown: str = ""
    structured: ProfileStructured | None = None
    pages: int = 0
    success: bool = False
    error: str | None = None
    structured_parse_error: bool = False


class GapAnalysisRequest(BaseModel):
    """Request for profile vs JD gap analysis."""

    profile: ProfileStructured
    jd_text: str


class GapAnalysisResponse(BaseModel):
    """Gap analysis response."""

    match_score: float = 0  # Changed from int to float
    matching_skills: list[str] = []
    missing_skills: list[str] = []
    recommendations: list[str] = []
    strengths: list[str] = []
    areas_to_improve: list[str] = []
    # New detailed fields (optional)
    jd_analysis: dict | None = None
    profile_skills: list[str] | None = None
    matching_required: list[str] | None = None
    missing_required: list[str] | None = None
    matching_preferred: list[str] | None = None
    missing_preferred: list[str] | None = None
    score_breakdown: dict | None = None


class GitHubRepoSummary(BaseModel):
    name: str
    language: str | None = None
    stars: int = 0


class GitHubDependencies(BaseModel):
    python: list[str] = []
    javascript: list[str] = []
    other: list[str] = []


class GitHubAnalysisResponse(BaseModel):
    type: Literal["user_profile", "repository"]
    username: str | None = None
    repo: str | None = None
    description: str | None = None
    stars: int | None = None
    total_repos: int | None = None
    repos_analyzed: list[GitHubRepoSummary] = []
    languages: dict[str, float] = {}
    dependencies: GitHubDependencies = GitHubDependencies()
    topics: list[str] = []
    primary_language: str | None = None
    frameworks: list[str] = []
    skill_level: str | None = None
    skills_identified: list[str] = []
    code_patterns: list[str] = []
    summary: str | None = None


# ============ API Endpoints ============


@router.get("/")
def read_root():
    """Health check for analysis module."""
    return {"module": "analysis", "status": "healthy", "test_mode": settings.TEST_MODE}


@router.get("/fixtures")
def get_fixtures():
    """
    TEST_MODE 전용: 사용 가능한 fixture 프로필 목록 반환.
    TEST_MODE가 아니면 빈 리스트 반환.
    """
    if not settings.TEST_MODE:
        return {"profiles": [], "test_mode": False}

    from app.services.fixture_service import get_fixture_profiles

    profiles = get_fixture_profiles()
    return {
        "profiles": [
            {"name": p.get("name", ""), "skills_count": len(p.get("skills", []))}
            for p in profiles
        ],
        "test_mode": True,
    }


@router.get("/fixtures/{name}", response_model=ResumeFileResponse)
def get_fixture_by_name(name: str):
    """
    TEST_MODE 전용: 이름으로 fixture 프로필을 ResumeFileResponse 형태로 반환.
    업로드 없이 바로 프로필 데이터를 사용할 수 있음.
    """
    if not settings.TEST_MODE:
        raise HTTPException(status_code=404, detail="TEST_MODE가 아닙니다")

    from app.services.fixture_service import get_fixture_profile

    fixture = get_fixture_profile(name)
    if not fixture:
        raise HTTPException(status_code=404, detail=f"Fixture '{name}'를 찾을 수 없습니다")

    return ResumeFileResponse(
        markdown=f"[TEST_MODE] Fixture profile: {fixture.get('name', 'unknown')}",
        structured=ProfileStructured(**fixture),
        pages=1,
        success=True,
        error=None,
        structured_parse_error=False,
    )


@router.get("/fixtures/jd")
def get_fixture_jds():
    """
    TEST_MODE 전용: 사용 가능한 fixture JD 목록 반환.
    TEST_MODE가 아니면 빈 리스트 반환.
    """
    if not settings.TEST_MODE:
        return {"jds": [], "test_mode": False}

    from app.services.fixture_service import get_fixture_jds as _get_fixture_jds

    jds = _get_fixture_jds()
    return {
        "jds": [
            {"title": jd.get("title", ""), "company": jd.get("company", "")}
            for jd in jds
        ],
        "test_mode": True,
    }


@router.get("/fixtures/jd/{title}")
def get_fixture_jd_by_title(title: str):
    """
    TEST_MODE 전용: 제목으로 fixture JD를 반환.
    갭 분석 테스트에 사용할 raw_text를 포함.
    """
    if not settings.TEST_MODE:
        raise HTTPException(status_code=404, detail="TEST_MODE가 아닙니다")

    from app.services.fixture_service import get_fixture_jd

    jd = get_fixture_jd(title)
    if not jd:
        raise HTTPException(status_code=404, detail=f"Fixture JD '{title}'를 찾을 수 없습니다")

    return {
        "title": jd.get("title", ""),
        "company": jd.get("company", ""),
        "raw_text": jd.get("raw_text", ""),
        "success": True,
    }


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
            detail="Resume text too short. Please provide at least 50 characters.",
        )

    try:
        result = await llm_service.parse_resume(request.resume_text)
        if result.get("parse_error"):
            return ResumeAnalysisResponse(raw_text=result.get("raw_text"), parse_error=True)
        return ResumeAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}") from e


@router.post("/resume/file", response_model=ResumeFileResponse)
async def analyze_resume_file(file: UploadFile = File(...), extract_structured: bool = True):
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
            detail=f"Unsupported file type. Allowed: {allowed_extensions}",
        )

    try:
        # TEST_MODE: fixture 프로필 바로 반환
        if settings.TEST_MODE:
            from app.services.fixture_service import get_fixture_profile

            # 파일명에서 이름 추출 시도
            name_hint = file.filename.split(".")[0] if file.filename else ""
            fixture = get_fixture_profile(name_hint)
            if not fixture:
                from app.services.fixture_service import get_fixture_profiles

                profiles = get_fixture_profiles()
                fixture = profiles[0] if profiles else None

            if fixture:
                structured_profile = ProfileStructured(**fixture)
                return ResumeFileResponse(
                    markdown=f"[TEST_MODE] Fixture profile: {fixture.get('name', 'unknown')}",
                    structured=structured_profile,
                    pages=1,
                    success=True,
                    error=None,
                    structured_parse_error=False,
                )

        content = await file.read()

        # Parse file using VLM
        parse_result = await resume_parser_service.parse_resume_file(
            file_bytes=content, file_extension=file_ext, apply_pii_mask=True
        )

        if not parse_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=parse_result.get("error", "Failed to parse resume"),
            )

        # Optionally extract structured JSON
        structured_data = None
        if extract_structured and parse_result["markdown"]:
            structured_data = await resume_parser_service.parse_to_structured_json(
                parse_result["markdown"]
            )

        structured_parse_error = bool(structured_data and structured_data.get("parse_error"))
        structured_profile = None
        if structured_data and not structured_parse_error:
            structured_profile = ProfileStructured(**structured_data)

        return ResumeFileResponse(
            markdown=parse_result["markdown"],
            structured=structured_profile,
            pages=parse_result["pages"],
            success=True,
            error=None,
            structured_parse_error=structured_parse_error,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}") from e


@router.post("/github", response_model=GitHubAnalysisResponse)
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
        repo_data = await github_service.analyze_repository(
            request.repo_url,
            include_readme=request.include_readme,
            include_languages=request.include_languages,
        )

        # Step 2: LLM으로 스킬 추론
        skills_analysis = await llm_service.infer_skills_from_github(
            languages=repo_data.get("languages", {}),
            dependencies=repo_data.get("dependencies", {}),
            readme_excerpt=repo_data.get("readme_excerpt") or "",
            topics=repo_data.get("topics", []),
        )

        # 사용자 프로필 vs 리포지토리 응답 구분
        is_user_profile = "username" in repo_data

        base_payload = {
            "languages": repo_data.get("languages", {}),
            "dependencies": repo_data.get("dependencies", {}),
            "topics": repo_data.get("topics", []),
            "primary_language": skills_analysis.get("primary_language"),
            "frameworks": skills_analysis.get("frameworks", []),
            "skill_level": skills_analysis.get("skill_level"),
            "skills_identified": skills_analysis.get("skills_identified", []),
            "code_patterns": skills_analysis.get("code_patterns", []),
            "summary": skills_analysis.get("summary", ""),
        }

        if is_user_profile:
            return GitHubAnalysisResponse(
                type="user_profile",
                username=repo_data.get("username"),
                total_repos=repo_data.get("total_repos", 0),
                repos_analyzed=repo_data.get("repos_analyzed", []),
                **base_payload,
            )
        return GitHubAnalysisResponse(
            type="repository",
            repo=repo_data.get("repo"),
            description=repo_data.get("description"),
            stars=repo_data.get("stars", 0),
            **base_payload,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        if "404" in str(e) or "Not Found" in str(e):
            raise HTTPException(
                status_code=404,
                detail="리포지토리 또는 사용자를 찾을 수 없습니다. 공개 계정인지 확인해주세요.",
            ) from e
        raise HTTPException(status_code=500, detail=f"GitHub 분석 실패: {str(e)}") from e


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
            detail="JD text too short. Please provide at least 50 characters.",
        )

    try:
        profile_payload = (
            request.profile.model_dump()
            if hasattr(request.profile, "model_dump")
            else request.profile.dict()
        )
        result = await llm_service.analyze_gap(profile_payload, request.jd_text)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result.get("error"))
        return GapAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}") from e


@router.post("/gap/unified")
async def analyze_gap_unified(request: GapAnalysisRequest):
    """
    Perform unified gap analysis using LangGraph-based agent.

    This endpoint uses a 4-node pipeline:
    1. analyze_jd - Parse JD with temperature=0
    2. extract_skills - Extract skills from profile
    3. match_skills - Embedding-based skill matching
    4. generate_feedback - Personalized feedback generation

    Returns comprehensive matching analysis with deterministic scoring.
    """
    if not request.jd_text or len(request.jd_text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="JD text too short. Please provide at least 50 characters.",
        )

    try:
        from app.agents.unified_matching_agent import get_unified_matching_agent

        agent = get_unified_matching_agent()

        profile_payload = (
            request.profile.model_dump()
            if hasattr(request.profile, "model_dump")
            else request.profile.dict()
        )

        result = await agent.analyze(profile_payload, request.jd_text)

        return GapAnalysisResponse(
            match_score=result.match_score,
            matching_skills=result.matching_skills,
            missing_skills=result.missing_skills,
            recommendations=result.recommendations,
            strengths=result.strengths,
            areas_to_improve=result.missing_required[:5],
            jd_analysis=result.jd_analysis,
            profile_skills=result.profile_skills,
            matching_required=result.matching_required,
            missing_required=result.missing_required,
            matching_preferred=result.matching_preferred,
            missing_preferred=result.missing_preferred,
            score_breakdown=result.score_breakdown,
        )

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unified gap analysis failed: {str(e)}") from e


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
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}") from e
