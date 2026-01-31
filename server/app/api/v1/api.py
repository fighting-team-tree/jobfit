from fastapi import APIRouter
from app.api.v1.endpoints import analysis, interview, roadmap

api_router = APIRouter()

# 에이전트가 나중에 라우터를 채우기 편하도록 미리 구조만 잡아둡니다.
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
api_router.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
