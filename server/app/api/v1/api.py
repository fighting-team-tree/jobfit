from app.api.v1.endpoints import analysis, auth, companies, git, interview, profile, roadmap
from fastapi import APIRouter

api_router = APIRouter()

# Register all API routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(analysis.router, prefix="/analyze", tags=["analysis"])
api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
api_router.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(git.router, prefix="/git", tags=["git"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
