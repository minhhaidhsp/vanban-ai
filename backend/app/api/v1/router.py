from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, documents, constants

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(constants.router, prefix="/constants", tags=["constants"])
