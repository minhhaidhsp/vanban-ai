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
        self._model: str = s.llm_model_name
        self._timeout: int = s.llm_timeout
        self._max_retries: int = s.llm_max_retries
        self._temperature: float = s.llm_temperature
        self._max_tokens: int = s.llm_max_tokens

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
            "max_tokens": max_tokens if max_tokens is not None else self._max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        last_exc: Exception = RuntimeError("No attempts made")
        for attempt in range(1, self._max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.post(
                        f"{self._base_url}/v1/chat/completions",
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
            except Exception as exc:
                last_exc = exc
                if attempt < self._max_retries:
                    wait = 2 ** (attempt - 1)   # 1s, 2s, 4s …
                    logger.warning(
                        "LLM request failed (attempt %d/%d): %s — retrying in %ds",
                        attempt, self._max_retries, exc, wait,
                    )
                    await asyncio.sleep(wait)

        raise last_exc

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
            "max_tokens": self._max_tokens,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/v1/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                ) as response:
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
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self._base_url}/v1/models")
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
            latency_ms = int((time.monotonic() - start) * 1000)
            return {
                "status": "error",
                "message": str(exc),
                "latency_ms": latency_ms,
                "base_url": self._base_url,
            }


llm_service = LLMService()
