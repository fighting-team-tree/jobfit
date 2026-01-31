"""
Roadmap API Endpoints

Generates personalized learning roadmaps based on gap analysis.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.services.nvidia_service import nvidia_service

router = APIRouter()


# ============ Request/Response Models ============

class TodoItem(BaseModel):
    """Single todo item for learning roadmap."""
    id: int
    task: str
    skill: str
    priority: str  # high, medium, low
    estimated_hours: int
    resources: List[str] = []
    completed: bool = False


class WeeklyPlan(BaseModel):
    """Weekly learning plan."""
    week_number: int
    theme: str
    goals: List[str]
    todos: List[TodoItem]
    total_hours: int


class RoadmapRequest(BaseModel):
    """Request for generating learning roadmap."""
    gap_analysis: dict  # Result from /analyze/gap
    available_hours_per_week: int = 10
    weeks: int = 4


class RoadmapResponse(BaseModel):
    """Generated learning roadmap."""
    title: str
    summary: str
    weekly_plans: List[WeeklyPlan]
    total_estimated_hours: int
    recommended_resources: List[dict]


# ============ API Endpoints ============

@router.get("/")
def read_root():
    """Health check for roadmap module."""
    return {"module": "roadmap", "status": "healthy"}


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request: RoadmapRequest):
    """
    Generate a personalized learning roadmap based on gap analysis.
    
    - **gap_analysis**: Result from /analyze/gap endpoint
    - **available_hours_per_week**: Hours available for learning per week
    - **weeks**: Number of weeks for the roadmap
    
    Returns weekly learning plans with todos and resources.
    """
    gap = request.gap_analysis
    missing_skills = gap.get("missing_skills", [])
    recommendations = gap.get("recommendations", [])
    
    if not missing_skills:
        return RoadmapResponse(
            title="축하합니다! 🎉",
            summary="현재 프로필이 채용공고 요구사항과 잘 맞습니다. 지속적인 성장을 위한 선택적 학습 목록입니다.",
            weekly_plans=[],
            total_estimated_hours=0,
            recommended_resources=[]
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
            todos.append(TodoItem(
                id=todo_id,
                task=f"{skill} 기초 개념 학습",
                skill=skill,
                priority="high",
                estimated_hours=3,
                resources=[
                    f"https://docs.{skill.lower().replace(' ', '')}.io" if len(skill) < 15 else "",
                    f"YouTube: {skill} 튜토리얼"
                ]
            ))
            todo_id += 1
            
            todos.append(TodoItem(
                id=todo_id,
                task=f"{skill} 실습 프로젝트",
                skill=skill,
                priority="medium",
                estimated_hours=4,
                resources=[f"GitHub: {skill} 예제 프로젝트"]
            ))
            todo_id += 1
        
        total_hours = sum(t.estimated_hours for t in todos)
        
        weekly_plans.append(WeeklyPlan(
            week_number=week,
            theme=f"{', '.join(week_skills)} 집중 학습" if week_skills else "복습 및 정리",
            goals=[f"{skill} 기본기 습득" for skill in week_skills],
            todos=todos,
            total_hours=total_hours
        ))
    
    # Compile recommended resources
    resources = []
    for i, skill in enumerate(missing_skills[:5]):  # Top 5 skills
        resources.append({
            "skill": skill,
            "official_docs": f"공식 문서 참조",
            "courses": [f"{skill} 온라인 강의"],
            "practice": f"{skill} 실습 환경"
        })
    
    total_hours = sum(wp.total_hours for wp in weekly_plans)
    
    return RoadmapResponse(
        title=f"{request.weeks}주 학습 로드맵",
        summary=f"{len(missing_skills)}개의 부족한 역량을 {request.weeks}주간 학습합니다. 주당 약 {total_hours // request.weeks}시간 투자가 필요합니다.",
        weekly_plans=weekly_plans,
        total_estimated_hours=total_hours,
        recommended_resources=resources
    )


@router.post("/todo/complete")
async def complete_todo(todo_id: int, roadmap_id: str = "default"):
    """
    Mark a todo item as completed.
    
    In production, this would update the database.
    """
    return {
        "status": "success",
        "message": f"Todo {todo_id} marked as completed",
        "todo_id": todo_id
    }
