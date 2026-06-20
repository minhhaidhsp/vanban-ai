import logging
import random
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.services.stt_service import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_groq_key(settings) -> str:
    """Lấy random key từ llm_api_keys (cùng pool với LLM)."""
    keys = [k.strip() for k in settings.llm_api_keys.split(",") if k.strip()]
    if keys:
        return random.choice(keys)
    return settings.llm_api_key  # fallback single key nếu có

_ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".m4a", ".mpeg", ".mpga", ".wav", ".webm", ".ogg"}
_MAX_BYTES = 25 * 1024 * 1024  # 25 MB (Groq limit)

_LANGUAGES = [
    {"code": "vi", "name": "Tiếng Việt"},
    {"code": "en", "name": "English"},
]


def _validate_audio_file(file: UploadFile, content: bytes) -> None:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng không hỗ trợ. Chấp nhận: {', '.join(_ALLOWED_EXTENSIONS)}",
        )
    if len(content) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File quá lớn, tối đa 25MB",
        )


@router.get("/languages")
async def get_languages():
    """Danh sách ngôn ngữ hỗ trợ — không cần auth."""
    return _LANGUAGES


@router.post("/transcribe")
async def transcribe_file(
    file: UploadFile = File(...),
    language: str = Query("vi"),
    current_user: User = Depends(get_current_user),
):
    """Transcribe file âm thanh upload lên."""
    settings = get_settings()
    content = await file.read()
    _validate_audio_file(file, content)

    filename = file.filename or "audio.mp3"
    try:
        transcript = await transcribe_audio(
            content, filename, language,
            _get_groq_key(settings), settings.groq_stt_model,
        )
        return {"transcript": transcript, "language": language, "filename": filename}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[stt/transcribe] error: %s", exc)
        return {"transcript": "", "language": language, "filename": filename, "error": str(exc)}


@router.post("/transcribe-realtime")
async def transcribe_realtime(
    audio_blob: UploadFile = File(...),
    language: str = Query("vi"),
    current_user: User = Depends(get_current_user),
):
    """Transcribe audio blob từ MediaRecorder browser."""
    settings = get_settings()
    content = await audio_blob.read()

    filename = audio_blob.filename or "recording.webm"
    if len(content) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording quá lớn, tối đa 25MB",
        )

    try:
        transcript = await transcribe_audio(
            content, filename, language,
            _get_groq_key(settings), settings.groq_stt_model,
        )
        return {"transcript": transcript, "language": language, "filename": filename}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[stt/realtime] error: %s", exc)
        return {"transcript": "", "language": language, "filename": filename, "error": str(exc)}
