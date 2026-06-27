"""
Tests for /api/v1/ho-so/ endpoints.
Run: cd backend && python -m pytest tests/test_ho_so.py -v
"""
import re
import io
import pytest
from httpx import AsyncClient

from tests.conftest import auth, API


# ── Helper: complete all N buocs sequentially ────────────────────────────────

async def _complete_buocs(http: AsyncClient, hs_id: str, token: str, count: int = 5):
    """Complete the first `count` buocs in order, advancing to the next each time."""
    for _ in range(count):
        r = await http.get(f"{API}/ho-so/{hs_id}", headers=auth(token))
        assert r.status_code == 200
        dang_lam = next((b for b in r.json()["buoc"] if b["trang_thai"] == "dang_lam"), None)
        assert dang_lam is not None
        r2 = await http.patch(
            f"{API}/ho-so/{hs_id}/buoc/{dang_lam['id']}",
            json={"trang_thai": "xong"},
            headers=auth(token),
        )
        assert r2.status_code == 200


# ════════════════════════════════════════════════════════════════════════════════
# NHÓM 0 — Các test gốc (giữ nguyên)
# ════════════════════════════════════════════════════════════════════════════════

async def test_create_ho_so(http: AsyncClient, hs_factory):
    hs = await hs_factory()
    assert hs["loai_thu_tuc"] == "Đăng ký thành lập hộ kinh doanh"
    assert hs["ten_chu_ho_so"] == "Test User Fixture"
    assert hs["trang_thai"] == "dang_xu_ly"
    assert re.match(r"HS-\d{4}-\d{3}", hs["ma_ho_so"]), f"ma_ho_so format sai: {hs['ma_ho_so']}"
    assert "id" in hs
    assert hs["owner_id"]


async def test_create_ho_so_auto_creates_5_buoc(http: AsyncClient, hs_factory):
    hs = await hs_factory()
    buocs = hs["buoc"]
    assert len(buocs) == 5
    assert buocs[0]["trang_thai"] == "dang_lam"
    for b in buocs[1:]:
        assert b["trang_thai"] == "cho", f"Buoc {b['thu_tu']} expected 'cho', got {b['trang_thai']}"
    assert [b["thu_tu"] for b in buocs] == [1, 2, 3, 4, 5]


async def test_list_ho_so_staff_filter(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    hs_staff = await hs_factory(token=staff_token)
    hs_admin = await hs_factory(token=admin_token)
    r = await http.get(f"{API}/ho-so/", headers=auth(staff_token))
    assert r.status_code == 200
    ids = {x["id"] for x in r.json()}
    assert hs_staff["id"] in ids, "Staff phải thấy hồ sơ của mình"
    assert hs_admin["id"] not in ids, "Staff không được thấy hồ sơ của admin"


async def test_list_ho_so_admin_sees_all(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    hs_staff = await hs_factory(token=staff_token)
    r = await http.get(f"{API}/ho-so/", headers=auth(admin_token))
    assert r.status_code == 200
    ids = {x["id"] for x in r.json()}
    assert hs_staff["id"] in ids, "Admin phải thấy hồ sơ của staff"


async def test_complete_buoc(http: AsyncClient, staff_token: str, hs_factory):
    hs = await hs_factory()
    buoc1 = hs["buoc"][0]
    assert buoc1["trang_thai"] == "dang_lam"
    r = await http.patch(
        f"{API}/ho-so/{hs['id']}/buoc/{buoc1['id']}",
        json={"trang_thai": "xong", "ket_qua": "Kiem tra xong"},
        headers=auth(staff_token),
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["trang_thai"] == "xong"
    assert updated["hoan_thanh_luc"] is not None, "hoan_thanh_luc phải được set"
    r2 = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    buocs = r2.json()["buoc"]
    assert buocs[1]["trang_thai"] == "dang_lam", "Bước 2 phải chuyển sang dang_lam"


async def test_complete_buoc_5_closes_ho_so(http: AsyncClient, staff_token: str, hs_factory):
    hs = await hs_factory()
    await _complete_buocs(http, hs["id"], staff_token, count=5)
    r = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    assert r.json()["trang_thai"] == "hoan_thanh"


async def test_update_ho_so_trang_thai(http: AsyncClient, staff_token: str, hs_factory):
    hs = await hs_factory()
    r = await http.patch(
        f"{API}/ho-so/{hs['id']}",
        json={"trang_thai": "cho_bo_sung", "ly_do_bo_sung": "Thieu giay to"},
        headers=auth(staff_token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["trang_thai"] == "cho_bo_sung"
    assert body["ly_do_bo_sung"] == "Thieu giay to"


async def test_delete_ho_so_owner(http: AsyncClient, staff_token: str, hs_factory):
    hs = await hs_factory()
    r = await http.delete(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    assert r.status_code == 204
    r2 = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    assert r2.status_code == 404


async def test_delete_ho_so_other_user_forbidden(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    hs = await hs_factory(token=admin_token)
    r = await http.delete(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


async def test_get_ho_so_not_found(http: AsyncClient, staff_token: str):
    r = await http.get(f"{API}/ho-so/nonexistent-id-00000", headers=auth(staff_token))
    assert r.status_code == 404


async def test_ma_ho_so_unique(http: AsyncClient, hs_factory):
    hs1 = await hs_factory()
    hs2 = await hs_factory()
    assert hs1["ma_ho_so"] != hs2["ma_ho_so"]
    assert re.match(r"HS-\d{4}-\d{3}", hs1["ma_ho_so"])
    assert re.match(r"HS-\d{4}-\d{3}", hs2["ma_ho_so"])
    num1 = int(hs1["ma_ho_so"].split("-")[2])
    num2 = int(hs2["ma_ho_so"].split("-")[2])
    assert num2 > num1, f"num2 ({num2}) phải > num1 ({num1})"


async def test_upload_file_invalid_type(http: AsyncClient, staff_token: str, hs_factory):
    hs = await hs_factory()
    fake_exe = b"MZ\x90\x00"
    r = await http.post(
        f"{API}/ho-so/{hs['id']}/files",
        files={"file": ("malware.exe", fake_exe, "application/octet-stream")},
        data={"loai_file": "ho_so_goc"},
        headers=auth(staff_token),
    )
    assert r.status_code == 415, f"Expected 415, got {r.status_code}: {r.text}"


# ════════════════════════════════════════════════════════════════════════════════
# NHÓM 1 — Happy path bổ sung
# ════════════════════════════════════════════════════════════════════════════════

async def test_all_buocs_xong_after_hoan_thanh(http: AsyncClient, staff_token: str, hs_factory):
    """Sau khi hoàn thành bước 5, tất cả 5 buoc phải có trang_thai='xong' và hoan_thanh_luc set."""
    hs = await hs_factory()
    await _complete_buocs(http, hs["id"], staff_token, count=5)

    r = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    data = r.json()
    assert data["trang_thai"] == "hoan_thanh"
    for buoc in data["buoc"]:
        assert buoc["trang_thai"] == "xong", f"Buoc {buoc['thu_tu']} phải là xong, got {buoc['trang_thai']}"
        assert buoc["hoan_thanh_luc"] is not None, f"Buoc {buoc['thu_tu']} thiếu hoan_thanh_luc"


async def test_cannot_update_buoc_after_hoan_thanh(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    """Sau khi hoan_thanh, mọi PATCH buoc phải trả 409."""
    hs = await hs_factory()
    await _complete_buocs(http, hs["id"], staff_token, count=5)

    # Thử PATCH bước 1 (đã xong) sau khi hoan_thanh
    buoc_id = hs["buoc"][0]["id"]
    r = await http.patch(
        f"{API}/ho-so/{hs['id']}/buoc/{buoc_id}",
        json={"ket_qua": "cập nhật sau khi xong"},
        headers=auth(staff_token),
    )
    assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
    assert "hoàn thành" in r.json()["detail"].lower()


async def test_cannot_revert_from_hoan_thanh(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    """Sau khi hoan_thanh, PATCH trang_thai về dang_xu_ly phải trả 409."""
    hs = await hs_factory()
    await _complete_buocs(http, hs["id"], staff_token, count=5)

    r = await http.patch(
        f"{API}/ho-so/{hs['id']}",
        json={"trang_thai": "dang_xu_ly"},
        headers=auth(staff_token),
    )
    assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
    assert "hoàn thành" in r.json()["detail"].lower()


# ════════════════════════════════════════════════════════════════════════════════
# NHÓM 2 — Validation + cho_bo_sung
# ════════════════════════════════════════════════════════════════════════════════

async def test_create_missing_required_fields(http: AsyncClient, staff_token: str):
    """POST với body rỗng → 422 (thiếu loai_thu_tuc và ten_chu_ho_so)."""
    r = await http.post(f"{API}/ho-so/", json={}, headers=auth(staff_token))
    assert r.status_code == 422


async def test_create_missing_loai_thu_tuc(http: AsyncClient, staff_token: str):
    """POST thiếu loai_thu_tuc → 422, lỗi chỉ rõ field đó."""
    r = await http.post(
        f"{API}/ho-so/",
        json={"ten_chu_ho_so": "Nguyen Van A"},
        headers=auth(staff_token),
    )
    assert r.status_code == 422
    body = r.json()
    error_fields = [e["loc"][-1] for e in body.get("detail", [])]
    assert "loai_thu_tuc" in error_fields, f"Phải báo lỗi loai_thu_tuc, got: {error_fields}"


async def test_cho_bo_sung_requires_ly_do(http: AsyncClient, staff_token: str, hs_factory):
    """PATCH {trang_thai: cho_bo_sung} không có ly_do_bo_sung → 422."""
    hs = await hs_factory()
    r = await http.patch(
        f"{API}/ho-so/{hs['id']}",
        json={"trang_thai": "cho_bo_sung"},
        headers=auth(staff_token),
    )
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    assert "ly_do_bo_sung" in r.json()["detail"].lower()


async def test_revert_cho_bo_sung_to_dang_xu_ly(http: AsyncClient, staff_token: str, hs_factory):
    """Sau cho_bo_sung, PATCH về dang_xu_ly được phép (flow: công dân bổ sung xong)."""
    hs = await hs_factory()
    # Set cho_bo_sung
    r1 = await http.patch(
        f"{API}/ho-so/{hs['id']}",
        json={"trang_thai": "cho_bo_sung", "ly_do_bo_sung": "Thieu CCCD cong chung"},
        headers=auth(staff_token),
    )
    assert r1.status_code == 200
    assert r1.json()["trang_thai"] == "cho_bo_sung"

    # Revert về dang_xu_ly sau khi công dân bổ sung
    r2 = await http.patch(
        f"{API}/ho-so/{hs['id']}",
        json={"trang_thai": "dang_xu_ly"},
        headers=auth(staff_token),
    )
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
    assert r2.json()["trang_thai"] == "dang_xu_ly"


async def test_cho_bo_sung_buoc_stays_in_place(http: AsyncClient, staff_token: str, hs_factory):
    """Set ho_so → cho_bo_sung không làm thay đổi trang_thai của các buoc."""
    hs = await hs_factory()
    # Buoc 1 ban đầu là dang_lam
    assert hs["buoc"][0]["trang_thai"] == "dang_lam"

    # Set cho_bo_sung
    r = await http.patch(
        f"{API}/ho-so/{hs['id']}",
        json={"trang_thai": "cho_bo_sung", "ly_do_bo_sung": "Thieu giay to"},
        headers=auth(staff_token),
    )
    assert r.status_code == 200

    # Buoc 1 vẫn phải là dang_lam (không bị thay đổi tự động)
    r2 = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    buocs = r2.json()["buoc"]
    assert buocs[0]["trang_thai"] == "dang_lam", "Buoc 1 phải giữ nguyên dang_lam"
    # Các bước còn lại vẫn là cho
    for b in buocs[1:]:
        assert b["trang_thai"] == "cho", f"Buoc {b['thu_tu']} phải là cho, got {b['trang_thai']}"


# ════════════════════════════════════════════════════════════════════════════════
# NHÓM 3 — Document linking
# ════════════════════════════════════════════════════════════════════════════════

async def test_attach_valid_document_to_buoc(http: AsyncClient, staff_token: str, hs_factory):
    """Gắn document_id hợp lệ vào buoc → 200, buoc.document_id được set."""
    hs = await hs_factory()
    buoc1_id = hs["buoc"][0]["id"]

    # Tạo document thực
    doc_r = await http.post(
        f"{API}/documents/",
        json={"title": "GCN test doc"},
        headers=auth(staff_token),
    )
    assert doc_r.status_code in (200, 201), f"Tạo document thất bại: {doc_r.text}"
    doc_id = doc_r.json()["id"]

    try:
        r = await http.patch(
            f"{API}/ho-so/{hs['id']}/buoc/{buoc1_id}",
            json={"document_id": doc_id},
            headers=auth(staff_token),
        )
        assert r.status_code == 200
        assert r.json()["document_id"] == doc_id
    finally:
        await http.delete(f"{API}/documents/{doc_id}", headers=auth(staff_token))


async def test_attach_nonexistent_document_raises_404(http: AsyncClient, staff_token: str, hs_factory):
    """Gắn document_id không tồn tại → 404, không phải 500."""
    hs = await hs_factory()
    buoc1_id = hs["buoc"][0]["id"]

    r = await http.patch(
        f"{API}/ho-so/{hs['id']}/buoc/{buoc1_id}",
        json={"document_id": "00000000-0000-0000-0000-000000000000"},
        headers=auth(staff_token),
    )
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
    assert "Document" in r.json()["detail"]


async def test_complete_step3_without_document_allowed(http: AsyncClient, staff_token: str, hs_factory):
    """Hoàn thành bước 3 (soan_thao) không có document_id → 200 (không block)."""
    hs = await hs_factory()
    # Complete bước 1 và 2 trước
    await _complete_buocs(http, hs["id"], staff_token, count=2)

    # Lấy buoc 3 (hiện đang dang_lam)
    r = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    buoc3 = next(b for b in r.json()["buoc"] if b["thu_tu"] == 3)
    assert buoc3["trang_thai"] == "dang_lam"
    assert buoc3["document_id"] is None

    # Hoàn thành bước 3 mà không gắn document_id
    r2 = await http.patch(
        f"{API}/ho-so/{hs['id']}/buoc/{buoc3['id']}",
        json={"trang_thai": "xong"},
        headers=auth(staff_token),
    )
    assert r2.status_code == 200, f"Expected 200 (không block khi thiếu document_id), got {r2.status_code}"
    assert r2.json()["trang_thai"] == "xong"


async def test_complete_step4_ho_so_still_dang_xu_ly(http: AsyncClient, staff_token: str, hs_factory):
    """Hoàn thành bước 1-4, ho_so.trang_thai vẫn là dang_xu_ly (chưa phải hoan_thanh)."""
    hs = await hs_factory()
    await _complete_buocs(http, hs["id"], staff_token, count=4)

    r = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    data = r.json()
    assert data["trang_thai"] == "dang_xu_ly", (
        f"Sau bước 4, ho_so phải vẫn là dang_xu_ly, got: {data['trang_thai']}"
    )
    # Bước 5 phải là dang_lam
    buoc5 = next(b for b in data["buoc"] if b["thu_tu"] == 5)
    assert buoc5["trang_thai"] == "dang_lam"


# ════════════════════════════════════════════════════════════════════════════════
# NHÓM 6 — Edge cases / Security
# ════════════════════════════════════════════════════════════════════════════════

async def test_get_other_user_ho_so_forbidden(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    """Staff không được GET hồ sơ do người khác (admin) tạo → 403."""
    hs = await hs_factory(token=admin_token)  # admin owns this
    r = await http.get(f"{API}/ho-so/{hs['id']}", headers=auth(staff_token))
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"


async def test_skip_buoc_order_not_allowed(http: AsyncClient, staff_token: str, hs_factory):
    """Cố hoàn thành bước đang ở 'cho' (không phải dang_lam) → 409."""
    hs = await hs_factory()
    # Bước 2 đang là 'cho', bước 1 đang là 'dang_lam'
    buoc2 = next(b for b in hs["buoc"] if b["thu_tu"] == 2)
    assert buoc2["trang_thai"] == "cho"

    r = await http.patch(
        f"{API}/ho-so/{hs['id']}/buoc/{buoc2['id']}",
        json={"trang_thai": "xong"},
        headers=auth(staff_token),
    )
    assert r.status_code == 409, f"Expected 409 (skip order), got {r.status_code}: {r.text}"
    assert "đang thực hiện" in r.json()["detail"]


async def test_upload_file_too_large(http: AsyncClient, staff_token: str, hs_factory):
    """Upload file > 15MB → 413."""
    hs = await hs_factory()
    big_content = b"0" * (15 * 1024 * 1024 + 1)
    r = await http.post(
        f"{API}/ho-so/{hs['id']}/files",
        files={"file": ("big.pdf", big_content, "application/pdf")},
        data={"loai_file": "ho_so_goc"},
        headers=auth(staff_token),
    )
    assert r.status_code == 413, f"Expected 413, got {r.status_code}: {r.text}"


async def test_upload_valid_pdf(http: AsyncClient, staff_token: str, hs_factory):
    """Upload PDF hợp lệ → 200, FileOut có đủ fields."""
    hs = await hs_factory()
    fake_pdf = b"%PDF-1.0\n1 0 obj<</Type/Catalog>>endobj\nstartxref\n9\n%%EOF"
    r = await http.post(
        f"{API}/ho-so/{hs['id']}/files",
        files={"file": ("test.pdf", fake_pdf, "application/pdf")},
        data={"loai_file": "ho_so_goc"},
        headers=auth(staff_token),
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["ten_file"] == "test.pdf"
    assert body["loai_file"] == "ho_so_goc"
    assert body["ho_so_id"] == hs["id"]
    assert body["kich_thuoc"] == len(fake_pdf)
    assert "id" in body and "created_at" in body


async def test_unauthenticated_returns_401(http: AsyncClient):
    """GET /ho-so/ không có token → 401."""
    r = await http.get(f"{API}/ho-so/")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"


async def test_create_with_past_han_xu_ly(http: AsyncClient, hs_factory):
    """POST với han_xu_ly trong quá khứ → 201 (no server-side validation for past dates)."""
    hs = await hs_factory(extra={"han_xu_ly": "2020-01-01T00:00:00Z"})
    assert hs["trang_thai"] == "dang_xu_ly"
    assert hs["han_xu_ly"] is not None
    # Kiểm tra rằng ngày quá khứ được chấp nhận (không có validation)
    from datetime import datetime, timezone
    han_xu_ly = datetime.fromisoformat(hs["han_xu_ly"].replace("Z", "+00:00"))
    assert han_xu_ly.year == 2020


async def test_list_with_trang_thai_filter(http: AsyncClient, staff_token: str, hs_factory):
    """GET ?trang_thai=cho_bo_sung → chỉ trả hồ sơ đúng trạng thái."""
    hs_dang_xu_ly = await hs_factory()
    hs_cho_bo_sung = await hs_factory()

    # Chuyển hs_cho_bo_sung sang cho_bo_sung
    r = await http.patch(
        f"{API}/ho-so/{hs_cho_bo_sung['id']}",
        json={"trang_thai": "cho_bo_sung", "ly_do_bo_sung": "Thieu CCCD"},
        headers=auth(staff_token),
    )
    assert r.status_code == 200

    # Filter theo cho_bo_sung
    r2 = await http.get(
        f"{API}/ho-so/",
        params={"trang_thai": "cho_bo_sung"},
        headers=auth(staff_token),
    )
    assert r2.status_code == 200
    ids = {x["id"] for x in r2.json()}

    assert hs_cho_bo_sung["id"] in ids, "cho_bo_sung phải xuất hiện trong kết quả"
    assert hs_dang_xu_ly["id"] not in ids, "dang_xu_ly không nên xuất hiện"


async def test_delete_cascade_cleans_buocs_and_files(http: AsyncClient, staff_token: str, admin_token: str, hs_factory):
    """Xóa ho_so → GET trả 404 (buoc + file đã cascade delete qua FK)."""
    hs = await hs_factory()
    hs_id = hs["id"]

    # Upload file để có cả HoSoFile record
    fake_pdf = b"%PDF-1.0\ntest content"
    await http.post(
        f"{API}/ho-so/{hs_id}/files",
        files={"file": ("test.pdf", fake_pdf, "application/pdf")},
        data={"loai_file": "ho_so_goc"},
        headers=auth(staff_token),
    )

    # Xóa ho_so
    r_del = await http.delete(f"{API}/ho-so/{hs_id}", headers=auth(staff_token))
    assert r_del.status_code == 204

    # GET phải trả 404 (xác nhận ho_so đã xóa; cascade đảm bảo buoc + file cũng mất)
    r_get = await http.get(f"{API}/ho-so/{hs_id}", headers=auth(staff_token))
    assert r_get.status_code == 404


# ════════════════════════════════════════════════════════════════════════════════
# NHÓM STATS
# ════════════════════════════════════════════════════════════════════════════════

async def test_stats_returns_correct_structure(http: AsyncClient, staff_token: str):
    """GET /ho-so/stats → trả đủ fields HoSoStats."""
    r = await http.get(f"{API}/ho-so/stats", headers=auth(staff_token))
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    for field in ["tong", "moi", "dang_xu_ly", "cho_bo_sung", "hoan_thanh", "qua_han", "hoan_thanh_thang_nay"]:
        assert field in body, f"Thiếu field: {field}"
        assert isinstance(body[field], int), f"Field {field} phải là int"


async def test_stats_counts_by_trang_thai(http: AsyncClient, staff_token: str, hs_factory):
    """Stats phản ánh đúng số lượng theo trang_thai sau khi tạo mới."""
    r_before = await http.get(f"{API}/ho-so/stats", headers=auth(staff_token))
    before = r_before.json()

    hs = await hs_factory()  # creates 1 dang_xu_ly

    r_after = await http.get(f"{API}/ho-so/stats", headers=auth(staff_token))
    after = r_after.json()

    assert after["tong"] == before["tong"] + 1
    assert after["dang_xu_ly"] == before["dang_xu_ly"] + 1
