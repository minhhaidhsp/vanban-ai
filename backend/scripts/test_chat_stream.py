"""
Test chat_stream() va SSE chat history.

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe scripts\\test_chat_stream.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

LLM_URL = "https://write-link-wed-asus.trycloudflare.com"

PASS = "[PASS]"
FAIL = "[FAIL]"


def s(text) -> str:
    if text is None:
        return "None"
    return str(text).encode("ascii", "replace").decode()


async def test():
    from app.services.llm_service import llm_service
    from app.services.chat_history_service import (
        get_history, save_turn, clear_history
    )
    from app.core.redis import get_redis

    llm_service.update_base_url(LLM_URL)
    redis = await get_redis()
    print(f"LLM URL: {llm_service._base_url}\n")

    # ── Test 1: chat_stream() token streaming ────────────────────────────────
    print("=== Test 1: chat_stream() token streaming ===")
    messages = [{"role": "user", "content": "Xin chao, tra loi ngan tieng Viet"}]
    tokens = []
    print("Tokens: ", end="", flush=True)
    async for token in llm_service.chat_stream(messages):
        tokens.append(token)
        print(s(token), end="", flush=True)
    print()
    ok1 = len(tokens) > 0 and not any(t.startswith("[ERROR") for t in tokens)
    print(f"Token count: {len(tokens)}")
    print(PASS if ok1 else FAIL, "chat_stream() token streaming")
    print()

    # ── Test 2: LLM offline fallback ────────────────────────────────────────
    print("=== Test 2: LLM offline fallback ===")
    original = llm_service._base_url
    llm_service.update_base_url("")
    offline_tokens = []
    async for token in llm_service.chat_stream(messages):
        offline_tokens.append(token)
    llm_service.update_base_url(original)
    ok2 = offline_tokens == ["[LLM_OFFLINE]"]
    print(f"Offline tokens: {offline_tokens}")
    print(PASS if ok2 else FAIL, "LLM offline yields [LLM_OFFLINE]")
    print()

    # ── Test 3: save_turn + get_history ─────────────────────────────────────
    print("=== Test 3: Redis chat history ===")
    user_id = "test-user-001"
    doc_id = "test-doc"
    await clear_history(user_id, doc_id, redis)

    await save_turn(user_id, doc_id, "Cau hoi 1", "Tra loi 1", redis)
    history = await get_history(user_id, doc_id, redis)
    ok3a = len(history) == 2 and history[0]["role"] == "user" and history[1]["role"] == "assistant"
    print(f"After 1 turn: {len(history)} messages")

    await save_turn(user_id, doc_id, "Cau hoi 2", "Tra loi 2", redis)
    history2 = await get_history(user_id, doc_id, redis, last_n=1)
    ok3b = len(history2) == 2 and history2[0]["content"] == "Cau hoi 2"
    print(f"last_n=1 returns: {len(history2)} messages, last_n=1 correct: {ok3b}")

    ok3 = ok3a and ok3b
    print(PASS if ok3 else FAIL, "save_turn + get_history")
    print()

    # ── Test 4: clear_history ────────────────────────────────────────────────
    print("=== Test 4: clear_history ===")
    await clear_history(user_id, doc_id, redis)
    empty = await get_history(user_id, doc_id, redis)
    ok4 = len(empty) == 0
    print(f"After clear: {len(empty)} messages")
    print(PASS if ok4 else FAIL, "clear_history")
    print()

    # ── Test 5: Multi-turn context ───────────────────────────────────────────
    print("=== Test 5: Multi-turn (history injected in messages) ===")
    await save_turn(user_id, doc_id, "Thu tuc ho tich la gi?", "Ho tich la...", redis)
    loaded = await get_history(user_id, doc_id, redis, last_n=5)
    ok5 = len(loaded) == 2 and loaded[0]["role"] == "user"
    print(f"History loaded for next turn: {len(loaded)} messages")
    print(f"Content: {s(loaded[0]['content'])[:50]}")
    print(PASS if ok5 else FAIL, "History injected into next turn messages")
    await clear_history(user_id, doc_id, redis)
    print()

    # ── Summary ──────────────────────────────────────────────────────────────
    results = [ok1, ok2, ok3, ok4, ok5]
    passed = sum(results)
    print(f"=== Tong ket: {passed}/{len(results)} tests passed ===")


asyncio.run(test())
