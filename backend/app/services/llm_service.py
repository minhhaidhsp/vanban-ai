import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        s = get_settings()
        self._base_url: str = s.llm_base_url.rstrip("/")
        self._api_keys: list[str] = s.llm_api_key_list
        self._key_index: int = 0
        self._model: str = s.llm_model_name
        self._timeout: int = s.llm_timeout
        self._max_retries: int = s.llm_max_retries
        self._temperature: float = s.llm_temperature
        self._max_tokens: int = s.llm_max_tokens

    def _current_key(self) -> str:
        if not self._api_keys:
            return ""
        return self._api_keys[self._key_index % len(self._api_keys)]

    def _rotate_key(self) -> None:
        if len(self._api_keys) > 1:
            self._key_index = (self._key_index + 1) % len(self._api_keys)
            logger.warning(
                "LLM key rotated to index %d due to rate limit",
                self._key_index,
            )

    def update_base_url(self, url: str) -> None:
        self._base_url = url.rstrip("/")
        logger.info("LLM base URL updated to: %s", self._base_url)

    async def chat(
        self,
        messages: list[dict[str, Any]],
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> str:
        if not self._base_url:
            raise ValueError(
                "LLM_BASE_URL is not configured. "
                "Set it in .env or call PATCH /api/v1/llm/config."
            )

        payload: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self._temperature,
            "max_tokens": max_tokens if max_tokens is not None else 512,
            "stream": False,
        }
        # Chỉ thêm repetition_penalty cho vLLM/local models
        # Groq và Gemini không hỗ trợ
        is_groq = "groq.com" in self._base_url
        is_gemini = "generativelanguage.googleapis.com" in self._base_url
        if not is_groq and not is_gemini:
            payload["repetition_penalty"] = 1.15

        # json_mode chỉ dùng cho model hỗ trợ
        if json_mode and not is_gemini:
            payload["response_format"] = {"type": "json_object"}

        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            headers = {"Content-Type": "application/json"}
            current_key = self._current_key()
            if current_key:
                headers["Authorization"] = f"Bearer {current_key}"

            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.post(
                        f"{self._base_url}/chat/completions",
                        json=payload,
                        headers=headers,
                    )
                    if resp.status_code == 429:
                        self._rotate_key()
                        raise httpx.HTTPStatusError(
                            "Rate limited (429)", request=resp.request, response=resp
                        )
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
            except Exception as exc:
                last_exc = exc
                if attempt < self._max_retries:
                    wait = 2 ** (attempt - 1)
                    logger.warning(
                        "LLM call failed (attempt %d/%d): %s — retrying in %ds",
                        attempt, self._max_retries, exc, wait,
                    )
                    await asyncio.sleep(wait)

        raise last_exc  # type: ignore[misc]

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        temperature: float | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens one-by-one via SSE. Yields each token string."""
        if not self._base_url:
            yield "[LLM_OFFLINE]"
            return

        payload: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self._temperature,
            "max_tokens": 512,
            "stream": True,
        }
        is_groq = "groq.com" in self._base_url
        is_gemini = "generativelanguage.googleapis.com" in self._base_url
        if not is_groq and not is_gemini:
            payload["repetition_penalty"] = 1.15

        stream_headers = {"Content-Type": "application/json"}
        current_key = self._current_key()
        if current_key:
            stream_headers["Authorization"] = f"Bearer {current_key}"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/chat/completions",
                    json=payload,
                    headers=stream_headers,
                ) as response:
                    if response.status_code == 429:
                        self._rotate_key()
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk["choices"][0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue
        except Exception as exc:
            logger.error("[llm] stream error: %s", exc)
            yield f"[ERROR: {exc}]"

    async def health_check(self) -> dict[str, Any]:
        if not self._base_url:
            return {"status": "not_configured"}

        start = time.monotonic()
        last_error: str = "unknown"
        # Try every key (at least once even if no keys configured)
        attempts = max(1, len(self._api_keys))

        for _ in range(attempts):
            headers: dict[str, str] = {}
            current_key = self._current_key()
            if current_key:
                headers["Authorization"] = f"Bearer {current_key}"

            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(f"{self._base_url}/models", headers=headers)
                    if resp.status_code == 429:
                        self._rotate_key()
                        last_error = "rate_limited"
                        continue
                    resp.raise_for_status()
                    data = resp.json()

                latency_ms = int((time.monotonic() - start) * 1000)
                models = [m["id"] for m in data.get("data", [])]
                return {
                    "status": "ok",
                    "model": self._model,
                    "available_models": models,
                    "latency_ms": latency_ms,
                    "base_url": self._base_url,
                }
            except Exception as exc:
                last_error = str(exc)
                self._rotate_key()
                continue

        latency_ms = int((time.monotonic() - start) * 1000)
        return {
            "status": "error",
            "message": last_error,
            "latency_ms": latency_ms,
            "base_url": self._base_url,
        }


llm_service = LLMService()
