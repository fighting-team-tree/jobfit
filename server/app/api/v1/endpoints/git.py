"""
Git API Endpoints

Handles GitHub integration for auto-pushing solutions.
Token is passed per-request for security (not stored server-side).
"""

from app.services.git_push_service import git_push_service
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ============ Request/Response Models ============


class ValidateTokenRequest(BaseModel):
    """Request to validate GitHub token."""

    token: str


class ValidateTokenResponse(BaseModel):
    """Response for token validation."""

    valid: bool
    username: str | None = None
    name: str | None = None
    avatar_url: str | None = None
    repos_count: int | None = None
    error: str | None = None


class ListReposRequest(BaseModel):
    """Request to list repositories."""

    token: str


class RepoInfo(BaseModel):
    """Repository information."""

    full_name: str
    name: str
    private: bool
    default_branch: str
    url: str


class ListReposResponse(BaseModel):
    """Response for list repositories."""

    success: bool
    repos: list[RepoInfo] = []
    error: str | None = None


class PushSolutionRequest(BaseModel):
    """Request to push a solution."""

    token: str
    repo_full_name: str
    week: int
    problem_id: str
    problem_title: str
    solution_code: str
    language: str = "python"
    branch: str = "main"


class PushProblemRequest(BaseModel):
    """Request to push a problem."""

    token: str
    repo_full_name: str
    week: int
    problem_id: str
    problem_title: str
    problem_description: str
    starter_code: str | None = None
    branch: str = "main"


class PushResponse(BaseModel):
    """Response for push operations."""

    success: bool
    commit_sha: str | None = None
    commit_url: str | None = None
    file_url: str | None = None
    error: str | None = None


# ============ API Endpoints ============


@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_token(request: ValidateTokenRequest) -> ValidateTokenResponse:
    """
    Validate a GitHub Personal Access Token.

    Returns user info if valid, error otherwise.
    """
    result = await git_push_service.validate_token(request.token)
    return ValidateTokenResponse(**result)


@router.post("/repos", response_model=ListReposResponse)
async def list_repositories(request: ListReposRequest) -> ListReposResponse:
    """
    List repositories accessible with the provided token.

    Returns up to 20 most recently updated repositories.
    """
    result = await git_push_service.list_repos(request.token)

    if not result.get("success"):
        return ListReposResponse(success=False, error=result.get("error"))

    repos = [RepoInfo(**r) for r in result.get("repos", [])]
    return ListReposResponse(success=True, repos=repos)


@router.post("/push/solution", response_model=PushResponse)
async def push_solution(request: PushSolutionRequest) -> PushResponse:
    """
    Push a problem solution to GitHub.

    Creates file at: solutions/week{N}/{problem_id}.{ext}

    - **token**: GitHub Personal Access Token (not stored)
    - **repo_full_name**: Repository in format "owner/repo"
    - **week**: Week number for organizing files
    - **problem_id**: Problem identifier
    - **problem_title**: Title for the file header
    - **solution_code**: The solution code to push
    - **language**: Programming language (determines file extension)
    - **branch**: Target branch (default: main)
    """
    result = await git_push_service.push_solution(
        token=request.token,
        repo_full_name=request.repo_full_name,
        week=request.week,
        problem_id=request.problem_id,
        problem_title=request.problem_title,
        solution_code=request.solution_code,
        language=request.language,
        branch=request.branch,
    )

    return PushResponse(
        success=result.success,
        commit_sha=result.commit_sha,
        commit_url=result.commit_url,
        file_url=result.file_url,
        error=result.error,
    )


@router.post("/push/problem", response_model=PushResponse)
async def push_problem(request: PushProblemRequest) -> PushResponse:
    """
    Push a problem file to GitHub.

    Creates file at: problems/week{N}/{problem_id}.md

    - **token**: GitHub Personal Access Token
    - **repo_full_name**: Repository in format "owner/repo"
    - **week**: Week number
    - **problem_id**: Problem identifier
    - **problem_title**: Problem title
    - **problem_description**: Problem description in markdown
    - **starter_code**: Optional starter code template
    - **branch**: Target branch
    """
    result = await git_push_service.push_problem(
        token=request.token,
        repo_full_name=request.repo_full_name,
        week=request.week,
        problem_id=request.problem_id,
        problem_title=request.problem_title,
        problem_description=request.problem_description,
        starter_code=request.starter_code,
        branch=request.branch,
    )

    return PushResponse(
        success=result.success,
        commit_sha=result.commit_sha,
        commit_url=result.commit_url,
        file_url=result.file_url,
        error=result.error,
    )
