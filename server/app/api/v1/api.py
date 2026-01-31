from fastapi import APIRouter
from app.api.v1.endpoints import analysis, interview, roadmap, companies, git

api_router = APIRouter()

# Register all API routers
api_router.include_router(
    analysis.router, 
    prefix="/analyze", 
    tags=["analysis"]
)
api_router.include_router(
    interview.router, 
    prefix="/interview", 
    tags=["interview"]
)
api_router.include_router(
    roadmap.router, 
    prefix="/roadmap", 
    tags=["roadmap"]
)
api_router.include_router(
    companies.router,
    prefix="/companies",
    tags=["companies"]
)
api_router.include_router(
    git.router,
    prefix="/git",
    tags=["git"]
)
