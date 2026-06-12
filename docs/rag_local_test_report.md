# Báo cáo RAG Query — DB Local (7.525 chunks)

## Bước 1 — Xác nhận DB

| Thông số | Giá trị |
|----------|---------|
| Tổng chunks | **7.525** |
| Tổng tài liệu | **272** |
| Organization | **UBND PHƯỜNG NHIÊU LỘC — TP. Hồ Chí Minh** |
| Backend | http://localhost:8000 |
| Ngày chạy | 2026-06-12 |

---

## Bước 2 — Kết quả 12 câu hỏi (sắp theo confidence giảm dần)

| # | Câu hỏi | Conf | Cite | Sem | Citations | Nguồn (top 2) | Fallback |
|---|---------|------|------|-----|-----------|---------------|----------|
| 1 | Đăng ký khai tử thực hiện như thế nào? | 96.7% | 100.0% | 91.7% | 1 | Danh muc PL (QD 1833).pdf |  |
| 2 | Cấp bản sao trích lục hộ tịch cần gì? | 95.0% | 100.0% | 87.5% | 1 | Danh muc PL (QD 1833).pdf |  |
| 3 | Đăng ký thường trú cần những giấy tờ gì? | 93.4% | 100.0% | 83.5% | 1 | Danh muc PL (QD 1833).pdf |  |
| 4 | Thủ tục đăng ký kết hôn gồm những gì? | 93.3% | 100.0% | 83.2% | 1 | Danh muc PL (QD 1833).pdf |  |
| 5 | Đăng ký khai sinh cần những giấy tờ gì? | 92.2% | 100.0% | 80.6% | 1 | Danh muc PL (QD 1833).pdf |  |
| 6 | Thời hạn giải quyết đăng ký khai sinh là bao lâu? | 90.4% | 100.0% | 76.0% | 1 | Danh muc PL (QD 1833).pdf |  |
| 7 | Đăng ký tạm trú thực hiện ở đâu và cần gì? | 89.1% | 100.0% | 72.7% | 1 | Danh muc PL (QD 1833).pdf |  |
| 8 | Lệ phí đăng ký kết hôn là bao nhiêu? | 87.7% | 100.0% | 69.3% | 1 | Danh muc PL (QD 1833).pdf |  |
| 9 | Xin giấy xác nhận tình trạng hôn nhân cần chuẩn bị g | 77.9% | 50.0% | 94.7% | 0 | Danh muc PL (QD 1833).pdf |  |
| 10 | Chứng thực bản sao từ bản chính ở đâu? | 52.1% | 0.0% | 80.2% | 0 | DM_TTHC_CHUNG_THUC_(kem theo QD 3399).pdf | 31.3.2026_ KH tr |  |
| 11 | Thủ tục cấp căn cước công dân gồm những bước nào? | 50.6% | 50.0% | 58.1% | 0 | Danh muc PL (QD 1833).pdf |  |
| 12 | Thủ tục chứng thực chữ ký thực hiện thế nào? | 47.2% | 0.0% | 67.9% | 0 | DM_TTHC_CHUNG_THUC_(kem theo QD 3399).pdf | QD 1132-2025 Dan |  |

---

## Phân tích

### ✅ Câu đạt ≥90% — sẵn sàng demo
- **96.7%** — Đăng ký khai tử thực hiện như thế nào?
- **95.0%** — Cấp bản sao trích lục hộ tịch cần gì?
- **93.4%** — Đăng ký thường trú cần những giấy tờ gì?
- **93.3%** — Thủ tục đăng ký kết hôn gồm những gì?
- **92.2%** — Đăng ký khai sinh cần những giấy tờ gì?
- **90.4%** — Thời hạn giải quyết đăng ký khai sinh là bao lâu?

### 🟡 Câu 70–90% — dùng được, cần kiểm tra thêm
- **89.1%** — Đăng ký tạm trú thực hiện ở đâu và cần gì?
- **87.7%** — Lệ phí đăng ký kết hôn là bao nhiêu?
- **77.9%** — Xin giấy xác nhận tình trạng hôn nhân cần chuẩn bị gì?

### ❌ Câu <70% hoặc fallback — kho thiếu dữ liệu
- **52.1%** — Chứng thực bản sao từ bản chính ở đâu?
- **50.6%** — Thủ tục cấp căn cước công dân gồm những bước nào?
- **47.2%** — Thủ tục chứng thực chữ ký thực hiện thế nào?

---

## Kết luận

| Nhóm | Số câu |
|------|--------|
| ≥90% (demo được) | **6/12** |
| 70–90% (dùng được) | **3/12** |
| <70% hoặc fallback | **3/12** |

**Đánh giá:** Kho dữ liệu đủ tốt cho demo. Nên chọn các câu đạt ≥90%.

*(Script: `backend/scripts/test_rag_local.py` — xóa sau khi dùng)*