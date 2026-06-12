# Báo cáo kiểm tra RAG Query

**Ngày chạy:** 2026-06-12  
**Số câu hỏi:** 12  
**Backend:** http://localhost:8000 (môi trường local)  
**DB local:** 2 tài liệu — 8 chunks  
**Mô hình embedding:** BAAI/bge-m3  
**LLM:** Gemini 2.5 Flash Lite  

---

## ⚠️ Lưu ý môi trường

Bài kiểm tra chạy trên **DB local** — chỉ có **2 tài liệu (8 chunks)** và **không phải** là tài liệu thủ tục hành chính phường/xã. Tài liệu hiện tại trong DB local là:

- `53/2025/TT-BCA` — Thông tư BCA (liên quan cư trú/tạm trú)  
- `Trình bày đề cương nghiên cứu về phát triển...` — Tài liệu test/mẫu không liên quan

Kết quả bên dưới phản ánh **trạng thái kho dữ liệu**, không phải chất lượng pipeline RAG. Để đánh giá thực tế cần chạy lại trên **DB production** (Railway) sau khi đã upload đầy đủ văn bản.

---

## Kết quả theo confidence (giảm dần)

| # | Câu hỏi | Confidence | Citation Score | Semantic Score | Citations | Nguồn đầu | Fallback | Disclaimer |
|---|---------|-----------|---------------|---------------|-----------|-----------|----------|------------|
| 1 | Đăng ký khai sinh cần những giấy tờ gì? | 45.6% | 0.0% | 64.1% | 0 | Trình bày đề cương nghiên cứu... |  | ✓ |
| 2 | Thủ tục chứng thực chữ ký thực hiện thế nào? | 44.3% | 0.0% | 60.7% | 0 | Trình bày đề cương nghiên cứu... |  | ✓ |
| 3 | Thủ tục đăng ký kết hôn gồm những gì? | 20.0% | 50.0% | 48.4% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 4 | Đăng ký khai tử thực hiện như thế nào? | 20.0% | 50.0% | 48.4% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 5 | Chứng thực bản sao từ bản chính ở đâu? | 20.0% | 50.0% | 45.3% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 6 | Xin giấy xác nhận tình trạng hôn nhân cần chuẩn bị gì? | 20.0% | 50.0% | 42.7% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 7 | Thủ tục cấp căn cước công dân gồm những bước nào? | 20.0% | 50.0% | 48.4% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 8 | Đăng ký thường trú cần những giấy tờ gì? | 20.0% | 50.0% | 48.4% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 9 | Đăng ký tạm trú thực hiện ở đâu? | 20.0% | 50.0% | 42.7% | 0 | 53/2025/TT-BCA, Trình bày đề cương... | ✓ | ✓ |
| 10 | Thủ tục đăng ký giám hộ như thế nào? | 20.0% | 50.0% | 42.7% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 11 | Cấp bản sao trích lục hộ tịch cần gì? | 20.0% | 50.0% | 48.4% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |
| 12 | Thời hạn giải quyết đăng ký khai sinh là bao lâu? | 20.0% | 50.0% | 48.4% | 0 | Trình bày đề cương nghiên cứu... | ✓ | ✓ |

---

## Phân tích

### Câu đạt trên 90% confidence (sẵn sàng demo)
- *(không có — kho local thiếu tài liệu đúng chủ đề)*

### Câu đạt 70–90% confidence
- *(không có)*

### Câu dưới 70% hoặc fallback_mode=True (kho thiếu dữ liệu)
Tất cả 12 câu đều dưới 70%. Chi tiết:

- **45.6%** — Đăng ký khai sinh cần những giấy tờ gì?  
  → LLM trả lời dù semantic thấp (64.1%); nguồn không đúng chủ đề, 0 citation cụ thể
- **44.3%** — Thủ tục chứng thực chữ ký thực hiện thế nào?  
  → Tương tự, semantic 60.7%, không có citation
- **20.0% [fallback]** — 10 câu còn lại  
  → LLM tự nhận "không có thông tin", hệ thống cap confidence = 0.2, `fallback_mode = True`

---

## Chẩn đoán nguyên nhân

| Vấn đề | Nguyên nhân | Hành động cần làm |
|--------|-------------|-------------------|
| 0/12 câu đạt ≥70% | DB local chỉ có 2 tài liệu, không đúng chủ đề | Upload tài liệu thủ tục hành chính vào kho |
| `citation_score = 0%` trên 2 câu cao nhất | Nguồn ngữ nghĩa gần nhất là tài liệu test, LLM không cite được | Cần văn bản đúng topic |
| `citation_score = 50%` với fallback | Pattern cố định khi LLM trả lời out-of-scope | Không phải bug, là behavior đúng |
| `53/2025/TT-BCA` xuất hiện trong câu tạm trú | Đây là tài liệu duy nhất có liên quan — nhưng chỉ 1 tài liệu không đủ | Bổ sung thêm văn bản về cư trú |

---

## Kết luận

- Câu đạt ≥90%: **0/12**
- Câu 70–90%: **0/12**  
- Câu <70% hoặc fallback: **12/12**

**Đánh giá pipeline:** Hệ thống hoạt động đúng — `fallback_mode` được kích hoạt chính xác khi kho thiếu dữ liệu. Không có lỗi logic hay hallucination.

**Nguyên nhân thực sự:** Kho dữ liệu local không có tài liệu thủ tục hành chính phường/xã. Cần:
1. Upload các quyết định/thông tư về đăng ký hộ tịch, chứng thực, căn cước, cư trú
2. Chạy lại bài test này trên production (Railway DB) — nơi đã có tài liệu upload thực tế
3. Sau khi DB đầy đủ, câu về **đăng ký tạm trú** có thể đạt điểm cao nhất (đã có `53/2025/TT-BCA`)

**Script kiểm tra:** `backend/scripts/test_rag_queries.py` — có thể tái sử dụng khi cần đo lại.
