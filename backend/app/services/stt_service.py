import logging
from pathlib import Path

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

_CONTENT_TYPES: dict[str, str] = {
    ".mp3":  "audio/mpeg",
    ".mp4":  "audio/mp4",
    ".m4a":  "audio/mp4",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
    ".wav":  "audio/wav",
    ".webm": "audio/webm",
    ".ogg":  "audio/ogg",
}


def _content_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return _CONTENT_TYPES.get(ext, "audio/mpeg")


async def transcribe_audio(
    file_bytes: bytes,
    filename: str,
    language: str,
    api_key: str,
    model: str = "whisper-large-v3",
) -> str:
    """Gọi Groq Whisper API để transcribe audio, trả về plain text."""
    if not api_key:
        raise HTTPException(status_code=503, detail="Groq API key chưa được cấu hình")

    content_type = _content_type(filename)
    logger.info("[stt] transcribing %s (%d bytes, lang=%s)", filename, len(file_bytes), language)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            _GROQ_STT_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (filename, file_bytes, content_type)},
            data={
                "model": model,
                "language": language,
                "response_format": "text",
            },
        )

    if response.status_code != 200:
        detail = response.text[:500] if response.text else f"HTTP {response.status_code}"
        logger.error("[stt] Groq API error %s: %s", response.status_code, detail)
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Groq STT lỗi: {detail}",
        )

    transcript = response.text.strip()
    logger.info("[stt] done: %d chars", len(transcript))
    return transcript
