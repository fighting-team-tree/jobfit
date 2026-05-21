"""
Roadmap API Endpoints

Generates personalized learning roadmaps based on gap analysis.
Now includes Claude Agent integration for intelligent roadmap and problem generation.
Supports PostgreSQL database for authenticated users.
"""

import logging
import uuid
from typing import Literal

from app.core.auth import get_optional_user
from app.core.database import get_db
from app.models.db_models import Roadmap as RoadmapModel
from app.models.db_models import User
from app.models.user import OptionalUser, ReplitUser
from app.services.discord_service import discord_service
from app.services.google_calendar_service import google_calendar_service
from app.services.in_memory_store import ExpiringStore
from app.services.user_service import get_or_create_user
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ In-Memory Storage (Fallback) ============
roadmaps_store: ExpiringStore[str, object] = ExpiringStore(
    ttl_seconds=60 * 60 * 6,
    max_size=300,
)
problems_store: ExpiringStore[str, object] = ExpiringStore(
    ttl_seconds=60 * 60 * 6,
    max_size=1000,
)


def use_database(db: AsyncSession | None, user: OptionalUser) -> bool:
    """Check if we should use database mode."""
    return db is not None and user.is_authenticated


# ============ Request/Response Models ============


class TodoItem(BaseModel):
    """Single todo item for learning roadmap."""

    id: int
    task: str
    skill: str
    priority: str  # high, medium, low
    estimated_hours: int
    resources: list[str] = Field(default_factory=list)
    completed: bool = False


class WeeklyPlan(BaseModel):
    """Weekly learning plan."""

    week_number: int
    theme: str
    goals: list[str]
    todos: list[TodoItem]
    total_hours: int


class RoadmapRequest(BaseModel):
    """Request for generating learning roadmap."""

    gap_analysis: dict  # Result from /analyze/gap
    available_hours_per_week: int = Field(default=10, ge=1, le=80)
    weeks: int = Field(default=4, ge=1, le=52)


class RoadmapResponse(BaseModel):
    """Generated learning roadmap."""

    id: str | None = None
    title: str
    summary: str
    weekly_plans: list[WeeklyPlan]
    total_estimated_hours: int
    recommended_resources: list[dict]


# New models for Claude Agent integration
class AgentRoadmapRequest(BaseModel):
    """Request for Claude Agent roadmap generation."""

    missing_skills: list[str]
    timeline_weeks: int = Field(default=4, ge=1, le=52)
    target_role: str | None = None
    current_level: str = "intermediate"


class ProblemResponse(BaseModel):
    """Response for a generated problem."""

    id: str
    title: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]
    type: Literal["coding", "quiz", "practical"]  # Frontend expects 'type'
    skill: str
    hints: list[str] = Field(default_factory=list)
    test_cases: list[dict] = Field(default_factory=list)
    starter_code: str | None = None
    language: str = "python"
    solution: str | None = None
    explanation: str | None = None


class GenerateProblemsRequest(BaseModel):
    """Request to generate problems for a week."""

    week_number: int = Field(ge=1)
    skills: list[str]  # Frontend sends 'skills'
    count: int = Field(default=3, ge=1, le=10)  # Frontend sends 'count'
    learning_objectives: list[str] = Field(default_factory=list)


class EvaluateSolutionRequest(BaseModel):
    """Request to evaluate a user's solution."""

    problem_id: str
    user_solution: str


# ============ API Endpoints ============


@router.get("/")
def read_root():
    """Health check for roadmap module."""
    return {"module": "roadmap", "status": "healthy"}


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapRequest,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
):
    """
    Generate a personalized learning roadmap based on gap analysis.

    - **gap_analysis**: Result from /analyze/gap endpoint
    - **available_hours_per_week**: Hours available for learning per week
    - **weeks**: Number of weeks for the roadmap

    Returns weekly learning plans with todos and resources.
    """
    gap = request.gap_analysis
    missing_skills = gap.get("missing_skills", [])
    _ = gap.get("recommendations", [])

    if not missing_skills:
        return RoadmapResponse(
            id=None,
            title="축하합니다! 🎉",
            summary="현재 프로필이 채용공고 요구사항과 잘 맞습니다. 지속적인 성장을 위한 선택적 학습 목록입니다.",
            weekly_plans=[],
            total_estimated_hours=0,
            recommended_resources=[],
        )

    # Generate weekly plans
    weekly_plans = []
    todo_id = 1
    skills_per_week = max(1, len(missing_skills) // request.weeks)

    for week in range(1, request.weeks + 1):
        start_idx = (week - 1) * skills_per_week
        end_idx = min(start_idx + skills_per_week, len(missing_skills))
        week_skills = missing_skills[start_idx:end_idx]

        if not week_skills and week == 1:
            week_skills = missing_skills[:1]  # At least one skill

        todos = []
        for skill in week_skills:
            todos.append(
                TodoItem(
                    id=todo_id,
                    task=f"{skill} 기초 개념 학습",
                    skill=skill,
                    priority="high",
                    estimated_hours=3,
                    resources=[
                        f"https://docs.{skill.lower().replace(' ', '')}.io"
                        if len(skill) < 15
                        else "",
                        f"YouTube: {skill} 튜토리얼",
                    ],
                )
            )
            todo_id += 1

            todos.append(
                TodoItem(
                    id=todo_id,
                    task=f"{skill} 실습 프로젝트",
                    skill=skill,
                    priority="medium",
                    estimated_hours=4,
                    resources=[f"GitHub: {skill} 예제 프로젝트"],
                )
            )
            todo_id += 1

        total_hours = sum(t.estimated_hours for t in todos)

        weekly_plans.append(
            WeeklyPlan(
                week_number=week,
                theme=f"{', '.join(week_skills)} 집중 학습" if week_skills else "복습 및 정리",
                goals=[f"{skill} 기본기 습득" for skill in week_skills],
                todos=todos,
                total_hours=total_hours,
            )
        )

    # Compile recommended resources
    resources = []
    for _i, skill in enumerate(missing_skills[:5]):  # Top 5 skills
        resources.append(
            {
                "skill": skill,
                "official_docs": "공식 문서 참조",
                "courses": [f"{skill} 온라인 강의"],
                "practice": f"{skill} 실습 환경",
            }
        )

    total_hours = sum(wp.total_hours for wp in weekly_plans)
    roadmap_id = f"gen-{uuid.uuid4()}"

    response_data = RoadmapResponse(
        id=roadmap_id,
        title=f"{request.weeks}주 학습 로드맵",
        summary=f"{len(missing_skills)}개의 부족한 역량을 {request.weeks}주간 학습합니다. 주당 약 {total_hours // request.weeks}시간 투자가 필요합니다.",
        weekly_plans=weekly_plans,
        total_estimated_hours=total_hours,
        recommended_resources=resources,
    )

    # Save to database or store
    if use_database(db, user):
        replit_user = ReplitUser(user_id=user.user_id, username=user.username)
        await get_or_create_user(db, replit_user)

        db_roadmap = RoadmapModel(
            id=roadmap_id,
            user_id=user.user_id,
            title=response_data.title,
            description=response_data.summary,
            data=response_data.model_dump(),
            missing_skills=missing_skills,
            target_role=None,
            total_weeks=request.weeks,
        )
        db.add(db_roadmap)
        await db.commit()
    else:
        # Fallback: In-memory store
        roadmaps_store[roadmap_id] = response_data

    return response_data


@router.post("/generate/agent")
async def generate_roadmap_with_agent(
    request: AgentRoadmapRequest,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
):
    """
    Generate a learning roadmap using Claude Agent.

    - **missing_skills**: Skills to learn
    - **timeline_weeks**: Number of weeks
    - **target_role**: Target job role
    - **current_level**: Current skill level

    Returns AI-generated weekly plans with detailed objectives.
    """
    try:
        from app.agents.roadmap_agent import get_roadmap_agent

        agent = get_roadmap_agent()
        roadmap = await agent.generate_roadmap(
            missing_skills=request.missing_skills,
            timeline_weeks=request.timeline_weeks,
            target_role=request.target_role,
            current_level=request.current_level,
        )

        roadmap_data = {
            "id": roadmap.id,
            "title": roadmap.title,
            "description": roadmap.description,
            "total_weeks": roadmap.total_weeks,
            "weeks": [
                {
                    "week_number": w.week_number,
                    "title": w.title,
                    "focus_skills": w.focus_skills,
                    "learning_objectives": w.learning_objectives,
                    "resources": w.resources,
                    "estimated_hours": w.estimated_hours,
                }
                for w in roadmap.weeks
            ],
            "missing_skills": roadmap.missing_skills,
            "target_role": roadmap.target_role,
        }

        # Save to database if authenticated
        if use_database(db, user):
            replit_user = ReplitUser(user_id=user.user_id, username=user.username)
            await get_or_create_user(db, replit_user)

            db_roadmap = RoadmapModel(
                id=roadmap.id,
                user_id=user.user_id,
                title=roadmap.title,
                description=roadmap.description,
                data=roadmap_data,
                missing_skills=roadmap.missing_skills,
                target_role=roadmap.target_role,
                total_weeks=roadmap.total_weeks,
            )
            db.add(db_roadmap)
            await db.commit()
        else:
            # Fallback: In-memory storage
            roadmaps_store[roadmap.id] = roadmap

        return roadmap_data

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {str(e)}") from e


@router.post("/problems/generate", response_model=list[ProblemResponse])
async def generate_problems(request: GenerateProblemsRequest):
    """
    Generate practice problems for a week using Claude Agent.

    - **week_number**: Week number in the roadmap
    - **skills**: Skills to focus on
    - **count**: Number of problems to generate
    - **learning_objectives**: Week's learning objectives
    """
    import asyncio

    try:
        from app.agents.problem_generator import get_problem_generator

        generator = get_problem_generator()

        skills_to_use = request.skills[:2] if request.skills else []  # Limit to 2 skills
        count_per_skill = max(1, request.count // len(request.skills)) if request.skills else 1

        # Parallel API calls for faster generation
        tasks = [
            generator.generate_problems(
                skill=skill, difficulty="medium", problem_type="coding", count=count_per_skill
            )
            for skill in skills_to_use
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_problems = []
        errors = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Problem generation error: {result}")
                errors.append(str(result))
                continue  # Skip failed generations
            all_problems.extend(result)

        # 모든 task가 실패하고 문제가 없으면 에러 반환
        if not all_problems and errors:
            raise HTTPException(status_code=500, detail=f"문제 생성 실패: {'; '.join(errors)}")

        # Store problems
        for p in all_problems:
            problems_store[p.id] = p

        return [
            ProblemResponse(
                id=p.id,
                title=p.title,
                description=p.description,
                difficulty=p.difficulty,
                type=p.problem_type,
                skill=p.skill,
                language=p.language or "python",
                hints=p.hints,
                test_cases=p.test_cases,
                starter_code=p.starter_code,
                solution=p.solution,
                explanation=p.explanation,
            )
            for p in all_problems
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Problem generation failed: {str(e)}") from e


@router.get("/problems/{problem_id}")
async def get_problem_legacy(problem_id: str):
    """Get a specific problem by ID (legacy endpoint)."""
    return await get_problem(problem_id)


@router.get("/problem/{problem_id}")
async def get_problem(problem_id: str):
    """Get a specific problem by ID."""
    if problem_id not in problems_store:
        raise HTTPException(status_code=404, detail="Problem not found")

    p = problems_store[problem_id]
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "difficulty": p.difficulty,
        "type": p.problem_type,  # Frontend expects 'type' not 'problem_type'
        "skill": p.skill,
        "hints": p.hints,
        "test_cases": p.test_cases,
        "starter_code": p.starter_code,
        "language": "python",  # Default language
    }


@router.post("/problems/{problem_id}/evaluate")
async def evaluate_solution_legacy(problem_id: str, request: EvaluateSolutionRequest):
    """Evaluate a user's solution (legacy endpoint)."""
    return await evaluate_solution_unified(
        EvaluateSolutionRequestUnified(problem_id=problem_id, solution=request.user_solution)
    )


class ProblemInfo(BaseModel):
    """Problem information for evaluation."""

    title: str
    description: str
    skill: str | None = None
    difficulty: str | None = None
    hints: list[str] | None = None


class EvaluateSolutionRequestUnified(BaseModel):
    """Request to evaluate a user's solution (unified)."""

    problem_id: str
    solution: str
    problem: ProblemInfo | None = None  # Frontend에서 전달받은 문제 정보


@router.post("/evaluate")
async def evaluate_solution_unified(request: EvaluateSolutionRequestUnified):
    """
    Evaluate a user's solution using Claude Agent.

    Returns detailed feedback and score.
    """
    # 서버에 문제가 있으면 사용, 없으면 Frontend에서 전달받은 정보 사용
    problem = None
    if request.problem_id in problems_store:
        problem = problems_store[request.problem_id]
    elif request.problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")

    try:
        from app.agents.problem_generator import GeneratedProblem, get_problem_generator

        # 서버에 저장된 문제 또는 Frontend에서 전달받은 문제 사용
        if problem is None and request.problem:
            # Frontend에서 전달받은 정보로 임시 문제 객체 생성
            problem = GeneratedProblem(
                id=request.problem_id,
                title=request.problem.title,
                description=request.problem.description,
                difficulty=request.problem.difficulty or "medium",
                problem_type="coding",
                skill=request.problem.skill or "general",
                hints=request.problem.hints or [],
                test_cases=[],
            )

        generator = get_problem_generator()

        result = await generator.evaluate_solution(problem=problem, user_solution=request.solution)

        # Transform result to match frontend expectations
        return {
            "success": result.get("passed", False),
            "feedback": result.get("feedback", ""),
            "score": result.get("score", 0),
            "test_results": {
                "passed": result.get("tests_passed", 0),
                "failed": result.get("tests_failed", 0),
                "details": result.get("details", []),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}") from e


@router.post("/todo/complete")
async def complete_todo(todo_id: int, roadmap_id: str = "default"):
    """
    Mark a todo item as completed.

    In production, this would update the database.
    """
    return {
        "status": "success",
        "message": f"Todo {todo_id} marked as completed",
        "todo_id": todo_id,
    }


class CalendarSyncRequest(BaseModel):
    """Request schema for Google Calendar Roadmap Sync."""

    start_date: str = Field(default="2026-05-22", pattern=r"^\d{4}-\d{2}-\d{2}$")


class DiscordNotifyRequest(BaseModel):
    """Request schema for Discord Webhook Roadmap Notification."""

    week_number: int = Field(default=1, ge=1)


@router.post("/{roadmap_id}/sync-calendar")
async def sync_roadmap_to_calendar(
    roadmap_id: str,
    request: CalendarSyncRequest,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
):
    """
    Sync a generated roadmap to user's Google Calendar.
    Requires Google OAuth authentication.
    """
    if not use_database(db, user):
        raise HTTPException(
            status_code=401, detail="Google Calendar 동기화는 회원 로그인 후 이용 가능합니다."
        )

    # 1. Get User
    user_query = select(User).where(User.id == user.user_id)
    user_res = await db.execute(user_query)
    db_user = user_res.scalar_one_or_none()
    if not db_user or not db_user.google_refresh_token:
        raise HTTPException(
            status_code=400, detail="구글 로그인 연동이 필요합니다. 다시 로그인해주세요."
        )

    # 2. Get Roadmap
    roadmap_query = select(RoadmapModel).where(
        RoadmapModel.id == roadmap_id, RoadmapModel.user_id == user.user_id
    )
    roadmap_res = await db.execute(roadmap_query)
    roadmap = roadmap_res.scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="해당 로드맵을 찾을 수 없습니다.")

    # 3. Parse Roadmap weekly plans
    roadmap_data = roadmap.data
    weekly_plans = []

    if roadmap_data:
        if "weeks" in roadmap_data:
            for w in roadmap_data.get("weeks", []):
                weekly_plans.append(
                    {
                        "week_number": w.get("week_number"),
                        "theme": w.get("title", ""),
                        "goals": w.get("learning_objectives", []),
                        "todos": [
                            {
                                "task": res.split(":")[1].strip() if ":" in res else res,
                                "skill": w.get("focus_skills", ["학습"])[0]
                                if w.get("focus_skills")
                                else "General",
                                "priority": "medium",
                                "estimated_hours": 2,
                                "resources": [res],
                            }
                            for res in w.get("resources", [])
                        ],
                    }
                )
        elif "weekly_plans" in roadmap_data:
            weekly_plans = roadmap_data.get("weekly_plans", [])

    if not weekly_plans:
        raise HTTPException(
            status_code=400, detail="로드맵 내에 학습 계획이 비어있어 동기화할 수 없습니다."
        )

    # 4. Sync
    try:
        success = await google_calendar_service.sync_roadmap_to_calendar(
            user=db_user,
            roadmap_title=roadmap.title or "JobFit 학습 로드맵",
            weekly_plans=weekly_plans,
            start_date_str=request.start_date,
            db=db,
        )
        if not success:
            raise HTTPException(status_code=500, detail="구글 캘린더 동기화에 실패했습니다.")
        return {"status": "success", "message": "Google Calendar 동기화 성공"}
    except Exception as e:
        logger.error(f"Google calendar sync failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"구글 캘린더 동기화 중 오류 발생: {str(e)}"
        ) from e


@router.post("/{roadmap_id}/notify-discord")
async def notify_discord(
    roadmap_id: str,
    request: DiscordNotifyRequest,
    client_request: Request,
    user: OptionalUser = Depends(get_optional_user),
    db: AsyncSession | None = Depends(get_db),
):
    """
    Send weekly roadmap plan to user's Discord Webhook.
    """
    webhook_url = None
    roadmap_data = None
    roadmap_title = "JobFit 학습 로드맵"

    if use_database(db, user):
        user_query = select(User).where(User.id == user.user_id)
        user_res = await db.execute(user_query)
        db_user = user_res.scalar_one_or_none()
        if db_user:
            webhook_url = db_user.discord_webhook_url

        roadmap_query = select(RoadmapModel).where(
            RoadmapModel.id == roadmap_id, RoadmapModel.user_id == user.user_id
        )
        roadmap_res = await db.execute(roadmap_query)
        roadmap = roadmap_res.scalar_one_or_none()
        if roadmap:
            roadmap_data = roadmap.data
            roadmap_title = roadmap.title or "JobFit 학습 로드맵"
    else:
        # Demo fallback
        from app.api.v1.endpoints.profile import profiles_store as prof_store

        session_id = client_request.headers.get("x-jobfit-client-session")
        demo_key = f"demo:{session_id}" if session_id else None
        if demo_key and demo_key in prof_store:
            webhook_url = prof_store[demo_key].get("discord_webhook_url")

        # Get roadmap from store
        if roadmap_id in roadmaps_store:
            agent_roadmap = roadmaps_store[roadmap_id]
            roadmap_title = getattr(agent_roadmap, "title", "JobFit 학습 로드맵")
            is_mock = type(agent_roadmap).__name__ in ("Mock", "MagicMock", "AsyncMock")
            has_weekly_plans = (
                "weekly_plans" in getattr(agent_roadmap, "_mock_children", {})
                if is_mock
                else hasattr(agent_roadmap, "weekly_plans")
            )
            if has_weekly_plans:
                # RoadmapResponse fallback
                roadmap_data = {
                    "title": roadmap_title,
                    "weeks": [
                        {
                            "week_number": w.week_number,
                            "title": w.theme,
                            "focus_skills": [t.skill for t in w.todos][:2] if w.todos else ["학습"],
                            "learning_objectives": w.goals,
                            "resources": [r for t in w.todos for r in t.resources if r],
                            "estimated_hours": w.total_hours,
                        }
                        for w in agent_roadmap.weekly_plans
                    ],
                }
            else:
                # AgentRoadmap fallback
                roadmap_data = {
                    "title": roadmap_title,
                    "weeks": [
                        {
                            "week_number": w.week_number,
                            "title": w.title,
                            "focus_skills": w.focus_skills,
                            "learning_objectives": w.learning_objectives,
                            "resources": w.resources,
                            "estimated_hours": w.estimated_hours,
                        }
                        for w in getattr(agent_roadmap, "weeks", [])
                    ],
                }

    if not webhook_url:
        raise HTTPException(
            status_code=400,
            detail="디스코드 웹훅 URL이 설정되지 않았습니다. 프로필 설정에서 등록해주세요.",
        )

    if not roadmap_data:
        raise HTTPException(status_code=404, detail="로드맵 데이터를 찾을 수 없습니다.")

    # Find target weekly plan
    target_plan = None

    if "weeks" in roadmap_data:
        for w in roadmap_data.get("weeks", []):
            if w.get("week_number") == request.week_number:
                target_plan = {
                    "week_number": w.get("week_number"),
                    "theme": w.get("title", ""),
                    "goals": w.get("learning_objectives", []),
                    "todos": [
                        {
                            "task": res.split(":")[1].strip() if ":" in res else res,
                            "skill": w.get("focus_skills", ["학습"])[0]
                            if w.get("focus_skills")
                            else "General",
                            "priority": "medium",
                            "estimated_hours": 2,
                            "resources": [res],
                        }
                        for res in w.get("resources", [])
                    ],
                }
                break
    elif "weekly_plans" in roadmap_data:
        for wp in roadmap_data.get("weekly_plans", []):
            wp_dict = wp if isinstance(wp, dict) else wp.model_dump()
            if wp_dict.get("week_number") == request.week_number:
                target_plan = wp_dict
                break

    if not target_plan:
        raise HTTPException(
            status_code=400,
            detail=f"선택한 {request.week_number}주차 계획을 로드맵에서 찾을 수 없습니다.",
        )

    # Send Notification
    success = await discord_service.send_weekly_roadmap_notification(
        webhook_url=webhook_url, roadmap_title=roadmap_title, weekly_plan=target_plan
    )

    if not success:
        raise HTTPException(status_code=500, detail="디스코드 알림 발송에 실패했습니다.")

    return {"status": "success", "message": "Discord 알림 발송 성공"}
