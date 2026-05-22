"""Quick smoke-test for chunking_service (no model needed) and import checks."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── 1. Chunking service ──────────────────────────────────────────────────────
from app.services.chunking_service import chunk_document

sample_vb = """
UBND PHƯỜNG NHIỀU LỘC
Số: 15/2024/QĐ-UBND

QUYẾT ĐỊNH
Về việc phê duyệt kế hoạch công tác

Điều 1. Phạm vi điều chỉnh
Quyết định này quy định về phạm vi, đối tượng áp dụng và các biện pháp thực hiện
kế hoạch công tác năm 2024 trên địa bàn phường.

Điều 2. Đối tượng áp dụng
Quyết định này áp dụng đối với tất cả các cơ quan, đơn vị, tổ chức và cá nhân
hoạt động trên địa bàn phường Nhiều Lộc.

Điều 3. Điều khoản thi hành
Quyết định này có hiệu lực kể từ ngày ký ban hành. Trưởng phòng Hành chính,
các cơ quan, đơn vị liên quan chịu trách nhiệm thi hành quyết định này.
"""

metadata = {"so_ki_hieu": "15/2024/QĐ-UBND", "co_quan_ban_hanh": "UBND PHƯỜNG NHIỀU LỘC"}
chunks = chunk_document(sample_vb, metadata)

print(f"\nOK chunk_document: {len(chunks)} chunks")
for c in chunks:
    print(f"  [{c['chunk_index']}] dieu_khoan='{c['dieu_khoan'][:40]}'  tokens≈{c['token_count']}")
    print(f"       content[:80]: {c['content'][:80]!r}")

# ── 2. No-structure fallback (sliding window) ────────────────────────────────
long_text = "Đây là một đoạn văn bản thông thường. " * 200
chunks2 = chunk_document(long_text, {"so_ki_hieu": "TEST", "co_quan_ban_hanh": "TEST"})
print(f"\nOK sliding window: {len(chunks2)} chunks on {len(long_text)}-char text")

# ── 3. Import checks ─────────────────────────────────────────────────────────
print("\nOK importing pipeline_service ...", end="", flush=True)
from app.services import pipeline_service  # noqa: F401
print(" OK")

print("\nAll smoke tests passed.")
