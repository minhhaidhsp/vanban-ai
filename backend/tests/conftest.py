"""
Shared fixtures for ho_so tests.

Pattern: ASGI test client (no running server needed) + real PostgreSQL DB.
Each test creates data via API calls and cleans up in teardown.
Auth tokens obtained via the /auth/login endpoint (uses demo users from seed).
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport


API = "/api/v1"

# Demo users (seeded by seed_demo_users.py)
_STAFF_EMAIL    = "canbo@civicai.vn"
_STAFF_PASSWORD = "Demo@2026"
_ADMIN_EMAIL    = "quantri@civicai.vn"
_ADMIN_PASSWORD = "Demo@2026"


@pytest_asyncio.fixture
async def http():
    """HTTP client backed by the real FastAPI ASGI app.
    Model loading is patched out so tests don't wait for bge-m3.
    """
    from app.main import app
    with patch("app.main._load_models", new_callable=AsyncMock):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client


@pytest_asyncio.fixture
async def staff_token(http: AsyncClient) -> str:
    resp = await http.post(
        f"{API}/auth/login",
        data={"username": _STAFF_EMAIL, "password": _STAFF_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Staff login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(http: AsyncClient) -> str:
    resp = await http.post(
        f"{API}/auth/login",
        data={"username": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def hs_factory(http: AsyncClient, staff_token: str, admin_token: str):
    """Factory fixture: creates hồ sơ and auto-deletes after each test."""
    created: list[tuple[str, str]] = []  # [(hs_id, del_token), ...]

    async def make(token: str | None = None, extra: dict | None = None) -> dict:
        t = token or staff_token
        payload = {
            "loai_thu_tuc": "Đăng ký thành lập hộ kinh doanh",
            "ten_chu_ho_so": "Test User Fixture",
            **(extra or {}),
        }
        r = await http.post(f"{API}/ho-so/", json=payload, headers=auth(t))
        assert r.status_code == 201, f"create_hs failed: {r.text}"
        data = r.json()
        created.append((data["id"], admin_token))
        return data

    yield make

    for hs_id, del_tok in created:
        await http.delete(f"{API}/ho-so/{hs_id}", headers=auth(del_tok))
