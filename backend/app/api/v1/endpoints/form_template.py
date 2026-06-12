import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.core.storage import download_file

router = APIRouter()

DOCX_MIME = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

# ── Mapping từ khóa → tên hiển thị + file trong MinIO ────────────────────────

FORM_MAPPING: dict[str, dict[str, str]] = {
    "khai sinh": {
        "name": "Tờ khai đăng ký khai sinh",
        "file": "form-templates/01_To_khai_dang_ky_khai_sinh.docx",
    },
    "kết hôn": {
        "name": "Tờ khai đăng ký kết hôn",
        "file": "form-templates/02_To_khai_dang_ky_ket_hon.docx",
    },
    "khai tử": {
        "name": "Tờ khai đăng ký khai tử",
        "file": "form-templates/03_To_khai_dang_ky_khai_tu.docx",
    },
    "thường trú": {
        "name": "Đơn đăng ký thường trú",
        "file": "form-templates/04_Don_dang_ky_thuong_tru.docx",
    },
    "hộ khẩu": {
        "name": "Đơn đăng ký thường trú",
        "file": "form-templates/04_Don_dang_ky_thuong_tru.docx",
    },
    "tạm trú": {
        "name": "Đơn đăng ký tạm trú",
        "file": "form-templates/05_Don_dang_ky_tam_tru.docx",
    },
    "trích lục": {
        "name": "Đơn xin cấp bản sao trích lục hộ tịch",
        "file": "form-templates/06_Don_cap_ban_sao_trich_luc_ho_tich.docx",
    },
    "hộ tịch": {
        "name": "Đơn xin cấp bản sao trích lục hộ tịch",
        "file": "form-templates/06_Don_cap_ban_sao_trich_luc_ho_tich.docx",
    },
    "chứng thực": {
        "name": "Giấy đề nghị chứng thực bản sao",
        "file": "form-templates/07_Giay_de_nghi_chung_thuc_ban_sao.docx",
    },
    "bản sao": {
        "name": "Giấy đề nghị chứng thực bản sao",
        "file": "form-templates/07_Giay_de_nghi_chung_thuc_ban_sao.docx",
    },
}


def _detect(query: str) -> dict[str, str] | None:
    q = query.lower()
    for keyword, info in FORM_MAPPING.items():
        if keyword in q:
            return info
    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/detect-form")
async def detect_form_endpoint(body: dict) -> dict:
    """Detect xem câu hỏi có cần mẫu đơn không (public, không cần auth)."""
    result = _detect(body.get("query", ""))
    if result:
        return {"form_name": result["name"], "form_file": result["file"]}
    return {"form_name": None, "form_file": None}


@router.get("/download")
async def download_form_endpoint(file: str) -> Response:
    """Download mẫu đơn từ MinIO (public, không cần auth).

    file: đường dẫn trong bucket, vd: form-templates/01_xxx.docx
    Chỉ cho phép download từ thư mục form-templates/ để chống path traversal.
    """
    if not file.startswith("form-templates/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    filename = file.split("/")[-1]
    if not filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        data = await asyncio.to_thread(download_file, file)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    return Response(
        content=data,
        media_type=DOCX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
