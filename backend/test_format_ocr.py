import asyncio
import sys
import os
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Sample text OCR thô — giống output thực tế của pytesseract
SAMPLE_TEXT = """Mau-CT01-tt53.pdf
Mẫu CT01 ban hành kèm theo Thông tư số 53/2025/TT-BCA ngày
01/7/2025 của Bộ trưởng Bộ Công an CỘNG HÒA XÃ HỘI CHỦ
NGHĨA VIỆT NAM Độc lập – Tự do – Hạnh phúc TỜ KHAI THAY
ĐỔI THÔNG TIN CƯ TRÚ Kính
gửi(1):......................................................................................................
1. Họ, chữ đệm và tên khai sinh:
........................................................................................... 2. Ngày,
tháng, năm sinh:................./................../ ............................. 3. Giới
tính: ................ 4. Số định danh cá nhân: 5. Số điện thoại liên hệ:
...................................... .............6. Email: .........................................
7. Họ, chữ đệm và tên chủ hộ:.................................8. Mối quan hệ
với chủ hộ:.................. 9. Số định danh cá nhân của chủ hộ: 10. Nội
dung đề nghị(2):"""

async def main():
    # Load .env
    from dotenv import load_dotenv
    load_dotenv()

    from app.api.v1.endpoints.ocr import _format_ocr_text, _basic_format

    print("=" * 60)
    print("TEXT GỐC OCR:")
    print("=" * 60)
    print(SAMPLE_TEXT)

    print("\n" + "=" * 60)
    print("BASIC FORMAT (fallback):")
    print("=" * 60)
    print(_basic_format(SAMPLE_TEXT))

    print("\n" + "=" * 60)
    print("LLM FORMAT (Groq):")
    print("=" * 60)
    try:
        result = await _format_ocr_text(SAMPLE_TEXT, "Mau-CT01-tt53.pdf")
        print(result)
        print("\n--- STATS ---")
        print(f"Input:  {len(SAMPLE_TEXT)} ký tự")
        print(f"Output: {len(result)} ký tự")
        print(f"Khác nhau: {SAMPLE_TEXT.strip() != result.strip()}")
    except Exception as e:
        print(f"LỖI: {e}")

if __name__ == "__main__":
    asyncio.run(main())
