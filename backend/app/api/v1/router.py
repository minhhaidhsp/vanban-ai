from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, documents, constants, document_sources,
    organizations, recipient_suggestions, reference_docs,
    llm, rag, suggest, ocr,
)
from app.api.v1.endpoints.public_chat import router as public_chat_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(document_sources.router, prefix="/documents", tags=["document-sources"])
api_router.include_router(constants.router, prefix="/constants", tags=["constants"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(recipient_suggestions.router, prefix="/recipient-suggestions", tags=["recipient-suggestions"])
api_router.include_router(reference_docs.router, prefix="/reference-docs", tags=["reference-docs"])
api_router.include_router(llm.router, prefix="/llm", tags=["llm"])
api_router.include_router(rag.router, prefix="/rag", tags=["RAG"])
api_router.include_router(suggest.router, prefix="/suggest", tags=["Suggest"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
api_router.include_router(public_chat_router, prefix="/public", tags=["public"])
