from fastapi import APIRouter
from app.api.v1.endpoints import analysis, interview, roadmap

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
