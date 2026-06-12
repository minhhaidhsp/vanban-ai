"""
Upload 7 mẫu đơn vào MinIO local.
Chạy từ thư mục backend/: python scripts/upload_form_templates.py
"""
import os
import sys
from pathlib import Path

# Load .env từ backend/
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from minio import Minio

DOCX_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

FORM_DIR = Path(__file__).parent.parent / "form_templates"

FORM_FILES = [
    "01_To_khai_dang_ky_khai_sinh.docx",
    "02_To_khai_dang_ky_ket_hon.docx",
    "03_To_khai_dang_ky_khai_tu.docx",
    "04_Don_dang_ky_thuong_tru.docx",
    "05_Don_dang_ky_tam_tru.docx",
    "06_Don_cap_ban_sao_trich_luc_ho_tich.docx",
    "07_Giay_de_nghi_chung_thuc_ban_sao.docx",
]

def main():
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    bucket = os.getenv("MINIO_BUCKET_NAME", "vanban-ai")
    use_ssl = os.getenv("MINIO_USE_SSL", "false").lower() == "true"

    print(f"MinIO: {endpoint}  bucket: {bucket}  SSL: {use_ssl}")

    client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=use_ssl)

    # Đảm bảo bucket tồn tại
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        print(f"Created bucket: {bucket}")

    ok = 0
    for fname in FORM_FILES:
        local_path = FORM_DIR / fname
        if not local_path.exists():
            print(f"  [SKIP] File not found: {local_path}")
            continue

        object_name = f"form-templates/{fname}"
        file_size = local_path.stat().st_size

        with open(local_path, "rb") as f:
            client.put_object(
                bucket,
                object_name,
                f,
                file_size,
                content_type=DOCX_CONTENT_TYPE,
            )
        print(f"  [OK]   {object_name}  ({file_size:,} bytes)")
        ok += 1

    print(f"\nKết quả: {ok}/{len(FORM_FILES)} file đã upload.")

if __name__ == "__main__":
    main()
