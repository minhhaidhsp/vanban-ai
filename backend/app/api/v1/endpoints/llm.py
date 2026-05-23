import time
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.llm_service import llm_service

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TestRequest(BaseModel):
    prompt: str

class TestResponse(BaseModel):
    response: str
    latency_ms: int
    model: str

class ConfigRequest(BaseModel):
    llm_base_url: str

class ConfigResponse(BaseModel):
    status: str
    llm_base_url: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return await llm_service.health_check()


@router.post("/test", response_model=TestResponse)
async def test_llm(
    body: TestRequest,
    current_user: User = Depends(get_current_user),
):
    messages = [{"role": "user", "content": body.prompt}]
    start = time.monotonic()
    try:
        text = await llm_service.chat(messages)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    latency_ms = int((time.monotonic() - start) * 1000)
    return TestResponse(response=text, latency_ms=latency_ms, model=llm_service._model)


@router.patch("/config", response_model=ConfigResponse)
async def update_config(
    body: ConfigRequest,
    current_user: User = Depends(get_current_user),
):
    llm_service.update_base_url(body.llm_base_url)
    return ConfigResponse(status="updated", llm_base_url=body.llm_base_url)
