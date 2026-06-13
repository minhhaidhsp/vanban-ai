# Kịch bản test toàn trình — CivicAI
## Phiên bản: v2 · local · Backend localhost:8000 · Frontend localhost:3000
## Cập nhật: 13/06/2026

---

## Chuẩn bị trước khi chạy

- [ ] Docker PostgreSQL đang chạy (port 5432, không phải Windows PG)
- [ ] Backend: `cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload`
- [ ] Frontend: `cd frontend && npm run dev`
- [ ] MinIO đang chạy (cần cho upload/download mẫu đơn)
- [ ] Groq API key đã set trong backend/.env
- [ ] Mở trình duyệt tại `http://localhost:3000`

---

## PHẦN 1 — LANDING PAGE

### TC-01. Hiển thị landing page
**Bước:** Mở `http://localhost:3000`
**Kết quả mong đợi:**
- [ ] Hero gradient slate-900 → teal-900, tiêu đề đúng
- [ ] Subtitle nằm trên 2 hàng, không tràn
- [ ] Dải số liệu: 272, 7.525, 93%, 7
- [ ] Section 7 tác tử AI có badge Cốt lõi/Mở rộng
- [ ] Section Bảo mật có 3 card

### TC-02. Nút "Xem tính năng"
**Bước:** Click nút "Xem tính năng" trong Hero
**Kết quả:** Scroll xuống section 7 tác tử AI (id="features")

### TC-03. ChatWidget landing page
**Bước:** Click icon chat nổi góc dưới phải
**Đầu vào:** `Đăng ký khai sinh cần những giấy tờ gì?`
**Kết quả mong đợi:**
- [ ] Header teal, hiện "CivicAI"
- [ ] Trả lời có nội dung liên quan
- [ ] Citations inline link, không trùng lặp
- [ ] Click citation → modal popup hiện nội dung
- [ ] Nút "Tải mẫu Tờ khai đăng ký khai sinh" xuất hiện
- [ ] Download → file Word mở được

---

## PHẦN 2 — ĐĂNG KÝ / ĐĂNG NHẬP

### TC-04. Trang đăng ký
**Bước:** Vào `/register`
**Kết quả:**
- [ ] Layout 2 cột: panel teal trái, form trắng phải
- [ ] Panel trái có logo Building2, "CivicAI", 3 bullet

### TC-05. Đăng ký tài khoản demo
**Đầu vào:** Họ tên: `Nguyễn Văn Demo` · Email: `demo@civicai.vn` · Mật khẩu: `Demo@2026`
**Kết quả:** Chuyển sang login, nếu trùng email → hiện lỗi

### TC-06. Đăng nhập thành công
**Đầu vào:** `demo@civicai.vn` / `Demo@2026`
**Kết quả:** Vào dashboard, cookie access_token được set

### TC-07. Đăng nhập sai mật khẩu
**Kết quả:** Hiện lỗi "Email hoặc mật khẩu không đúng"

---

## PHẦN 3 — DASHBOARD

### TC-08. Tổng quan dashboard
**Kết quả mong đợi:**
- [ ] Header có ngày tháng hiện tại và tên đơn vị
- [ ] 4 metric card với màu teal/blue/slate/amber
- [ ] Panel Kho tri thức: 272 văn bản, 7.525 đoạn, 93%
- [ ] Sidebar 3 nhóm: NGHIỆP VỤ, KHO TRI THỨC, HỆ THỐNG

### TC-09. Sidebar navigation
**Kết quả:** Active item màu teal, chuyển trang đúng

---

## PHẦN 4 — TRANG TÀI LIỆU

### TC-10. Danh sách văn bản
**Kết quả mong đợi:**
- [ ] Chỉ 1 nút "Soạn văn bản mới"
- [ ] Ngày tạo có giờ phút (dd/mm/yyyy HH:mm)
- [ ] Click xóa → AlertDialog confirm trước khi xóa
- [ ] Badge loại văn bản màu teal

### TC-11. Tạo văn bản mới → WelcomePanel
**Bước:** Click "Soạn văn bản mới"
**Kết quả mong đợi:**
- [ ] Modal mở → chọn loại → vào WelcomePanel
- [ ] WelcomePanel có 3 tab: Chọn template / Tạo bằng AI / Trang trắng
- [ ] 3 tab hiện dạng pill/segment control nổi bật

---

## PHẦN 5 — WELCOME PANEL

### TC-12. Tab Chọn template
**Bước:** Click tab "Chọn template", click "Công văn"
**Kết quả:**
- [ ] Vào editor với cấu trúc công văn trống
- [ ] Tên văn bản: "Công văn không tiêu đề"
- [ ] Không có banner AI

### TC-13. Tab Tạo bằng AI
**Đầu vào:**
- Mô tả: `Soạn công văn của UBND phường gửi các tổ dân phố về vệ sinh môi trường, tổng vệ sinh trước Tết Nguyên đán, báo cáo kết quả trước ngày 25/01.`

**Kết quả mong đợi:**
- [ ] Không có lưới chọn loại văn bản (đã bỏ)
- [ ] Click "Tạo văn bản" → spinner teal 15-30 giây
- [ ] Văn bản có đủ: quốc hiệu, số ký hiệu, trích yếu, nội dung, nơi nhận
- [ ] Banner vàng "AI đã tạo mẫu..."
- [ ] Tên văn bản lấy từ trích yếu (không phải "không tiêu đề")

### TC-14. Tab Trang trắng — không upload
**Bước:** Click "Trang trắng" → "Vào editor"
**Kết quả:**
- [ ] Editor hoàn toàn trống, con trỏ nhấp nháy
- [ ] Tên: "Văn bản không tiêu đề"
- [ ] Thanh menu chỉ có TypeSelector, không có Độ mật/Độ khẩn/AI buttons
- [ ] Chọn loại từ TypeSelector → template load vào

### TC-15. Tab Trang trắng — upload file
**Bước:** Click "Trang trắng", kéo thả hoặc click upload một file PDF/Word
**Kết quả mong đợi:**
- [ ] Progress bar xuất hiện và tăng dần
- [ ] Sau khi xong → editor có nội dung từ file
- [ ] Tên văn bản = tên file (không có "không tiêu đề")
- [ ] Upload lần 2 cùng file → tên thêm "(1)"
- [ ] File KHÔNG xuất hiện trong danh sách OCR

### TC-16. Tên văn bản không trùng
**Bước:** Tạo 3 văn bản mới loại Tờ trình liên tiếp
**Kết quả:**
- [ ] "Tờ trình không tiêu đề"
- [ ] "Tờ trình không tiêu đề (1)"
- [ ] "Tờ trình không tiêu đề (2)"

---

## PHẦN 6 — EDITOR VĂN BẢN

### TC-17. Header editor
**Kết quả mong đợi:**
- [ ] Nút Back hover teal
- [ ] Tên có thể click sửa
- [ ] Badge loại văn bản cạnh tên
- [ ] Nút Lưu màu teal
- [ ] Nút LayoutGrid mở lại WelcomePanel
- [ ] Auto-save 30 giây

### TC-18. Thanh công cụ và cây thước
**Kết quả mong đợi:**
- [ ] Thanh công cụ (bold, italic...) hiện dưới top toolbar
- [ ] Cây thước hiện ngay dưới thanh công cụ
- [ ] Khi không focus editor: cả hai ẩn cùng nhau
- [ ] Khi focus: cả hai hiện cùng nhau
- [ ] Cây thước có 3 marker: trái/phải/first-line
- [ ] Kéo marker → indent đoạn thay đổi
- [ ] Tab key → indent tăng 10mm (không nhảy focus)
- [ ] Shift+Tab → indent giảm

### TC-19. Undo/Redo
**Bước:** Gõ text → Ctrl+Z → Ctrl+Y
**Kết quả:** Undo/redo hoạt động đúng

### TC-20. Cột trái — Tài liệu tham chiếu
**Kết quả mong đợi:**
- [ ] Header icon teal
- [ ] Nút Upload và Search màu teal
- [ ] Upload file → progress spinner → thêm vào danh sách
- [ ] Hover item → nút xóa hiện

### TC-21. Cột phải — Tab Công cụ (9 công cụ)
**Kết quả mong đợi:**
- [ ] 3 nhóm màu: teal (Rà soát, Chuẩn thể thức, Chuẩn văn phong), blue (Tóm tắt, Bảng số liệu, Gợi ý tiếp, Căn cứ pháp lý, So sánh), slate (Hỏi đáp)
- [ ] Mỗi công cụ hiện màu ngay, không cần hover
- [ ] Không còn badge "AI" trên Rà soát
- [ ] Hover card → tooltip mô tả chức năng

### TC-22. Công cụ Tóm tắt
**Kết quả:**
- [ ] Bubble user hiện "Tóm tắt" (không phải prompt dài)
- [ ] Markdown render đúng (xuống hàng, bullet)
- [ ] Task xuất hiện trong "Gần đây" với icon màu blue
- [ ] Click task history → chuyển tab Chat, scroll tới message

### TC-23. Công cụ Gợi ý tiếp (Soạn thảo nhanh)
**Kết quả:** Bubble "Gợi ý tiếp", kết quả là đoạn tiếp theo

### TC-24. Công cụ Bảng số liệu
**Điều kiện:** Dán vào ô Nội dung:
`Quý I/2026: 1.250 hồ sơ, hộ tịch 520, chứng thực 430, đất đai 180, khác 120. Tỷ lệ đúng hạn 96%.`
**Kết quả:** Bảng markdown 2 cột

### TC-25. Công cụ Căn cứ pháp lý
**Kết quả:** Gợi ý điều khoản kèm trích dẫn

### TC-26. Công cụ Chuẩn văn phong
**Kết quả:** Văn bản đã chuẩn hóa trong Chat AI

### TC-27. Chèn vào văn bản
**Bước:** Click "↩ Chèn vào văn bản" sau khi có kết quả
**Kết quả mong đợi:**
- [ ] Chèn vào vị trí con trỏ
- [ ] KHÔNG có dòng trống thừa giữa các đoạn
- [ ] Markdown render đúng (không hiện ký tự ** hay ##)
- [ ] Toast "Đã chèn vào văn bản"

### TC-28. Tab Chat AI
**Đầu vào:** `Văn bản này cần bổ sung thành phần thể thức nào?`
**Kết quả mong đợi:**
- [ ] Markdown render đúng
- [ ] Shift+Enter xuống hàng, Enter gửi
- [ ] Citations inline, click → modal
- [ ] Nếu có thủ tục → nút tải mẫu đơn

### TC-29. Rà soát văn bản (KỊCH BẢN DEMO CHÍNH)
**Điều kiện:** Mở VB-LOI-01 (ID: 00588f4d-639b-4b5d-afbb-61e4bc014f82)
**Bước:** Click "Rà soát" trong tab Công cụ
**7 lỗi phải phát hiện:**
- [ ] Quốc hiệu viết thường
- [ ] Thiếu số ký hiệu
- [ ] Thiếu địa danh ngày tháng
- [ ] Kính gởi → Kính gửi
- [ ] tết nguyên đán → Tết Nguyên đán
- [ ] xã rác → xả rác
- [ ] CHỦ TICH → CHỦ TỊCH

**Thao tác:**
- [ ] Click đề xuất → tô sáng đoạn lỗi trong editor
- [ ] Chấp nhận → lỗi được sửa
- [ ] Bỏ qua → lỗi bị bỏ qua
- [ ] "Áp dụng tất cả" → sửa hết

### TC-30. Chuẩn thể thức (Kiểm tra định dạng NĐ30)
**Điều kiện:** Mở VB-LOI-01
**Bước:** Click "Chuẩn thể thức"
**Kết quả:** Track changes về thể thức NĐ30

### TC-31. So sánh văn bản
**Điều kiện:** Mở VB-SS-02, ghim VB-SS-01 làm tham chiếu
**Bước:**
1. Mở VB-SS-02 (ID: 3098a853-230d-41f4-9182-f70c82882df3)
2. Thêm VB-SS-01 vào Tài liệu tham chiếu
3. Click "So sánh", chọn VB-SS-01
**Kết quả:** Nêu khác biệt: "cuối tuần" vs "sáng thứ Bảy", "25/01" vs "20/01"

### TC-32. Phần chữ ký — quyền hạn ký
**Kết quả mong đợi:**
- [ ] Dropdown có option trống (ký trực tiếp)
- [ ] Chọn trống → không hiện dòng quyền hạn trên văn bản
- [ ] Mặc định là "TM."

### TC-33. Xem trước và xuất file
**Kết quả mong đợi:**
- [ ] Preview không bị cắt chữ ngang trang
- [ ] Quốc hiệu hiện đầy đủ
- [ ] Tải DOCX → file mở được

---

## PHẦN 7 — TRA CỨU AI

### TC-34. Tra cứu câu hỏi cao điểm
**Câu chính:** `Đăng ký khai tử thực hiện như thế nào?`
**Kết quả:**
- [ ] Confidence ≥ 90%
- [ ] Citations không trùng lặp, dạng inline link
- [ ] Click citation → modal nội dung
- [ ] Nút "Tải mẫu Tờ khai đăng ký khai tử"
- [ ] Download Word thành công

**Câu dự phòng:** `Thủ tục đăng ký kết hôn gồm những gì?` (93.3%)

### TC-35. Tra cứu và download mẫu đơn
**Câu hỏi:** `Đăng ký khai sinh cần những giấy tờ gì?`
**Kết quả:**
- [ ] Confidence ≥ 90%
- [ ] Nút tải mẫu đơn xuất hiện
- [ ] Download thành công

---

## PHẦN 8 — KHO VĂN BẢN

### TC-36. Kho tri thức
**Kết quả:**
- [ ] Header "Kho tri thức", subtitle 272 văn bản, 7.525 đoạn
- [ ] Ngày upload có giờ phút
- [ ] Click xóa → AlertDialog confirm

---

## PHẦN 9 — OCR VĂN BẢN

### TC-37. Danh sách OCR
**Kết quả:**
- [ ] Ngày tạo có giờ phút
- [ ] Cột "Thao tác" (không phải "Hành động")
- [ ] Có nút Xóa → AlertDialog confirm
- [ ] Văn bản upload từ WelcomePanel KHÔNG xuất hiện ở đây

---

## PHẦN 10 — TÀI KHOẢN VÀ CÀI ĐẶT

### TC-38. Trang Tài khoản (/dashboard/profile)
**Kết quả mong đợi:**
- [ ] Hiện họ tên và email (email readonly)
- [ ] Có thể sửa họ tên → lưu thành công
- [ ] Form đổi mật khẩu hoạt động
- [ ] Mật khẩu mới ≠ xác nhận → hiện lỗi

### TC-39. Trang Cài đặt (/dashboard/settings)
**Kết quả mong đợi:**
- [ ] Form thông tin đơn vị: tên chủ quản, tên cơ quan, viết tắt, địa danh
- [ ] Form chữ ký mặc định: quyền hạn, tên tập thể, chức vụ
- [ ] Lưu → auto-fill vào văn bản mới

---

## PHẦN 11 — ĐĂNG XUẤT

### TC-40. Đăng xuất
**Kết quả:**
- [ ] Cookie xóa, về trang login
- [ ] Truy cập /dashboard → redirect login

---

## Tổng kết test

| Nhóm | Tổng TC | Pass | Fail | Ghi chú |
|---|---|---|---|---|
| Landing page | 3 | | | |
| Đăng ký / Login | 4 | | | |
| Dashboard | 2 | | | |
| Tài liệu | 2 | | | |
| Welcome Panel | 5 | | | |
| Editor — Header/Toolbar | 4 | | | |
| Editor — Công cụ AI | 11 | | | |
| Tra cứu AI | 2 | | | |
| Kho văn bản | 1 | | | |
| OCR | 1 | | | |
| Tài khoản/Cài đặt | 2 | | | |
| Đăng xuất | 1 | | | |
| **Tổng** | **38** | | | |

---

## Kịch bản quay video demo (90 giây)

**Cảnh 1 — Landing (10s):** Mở localhost:3000, scroll hero → số liệu → 7 tác tử → chat widget hỏi khai sinh → nút tải mẫu đơn.

**Cảnh 2 — Đăng nhập (5s):** Login nhanh.

**Cảnh 3 — Dashboard (10s):** Panel kho tri thức 272/7.525/93%.

**Cảnh 4 — WelcomePanel (10s):** Tab Tạo bằng AI → nhập yêu cầu TC-13 → tạo.

**Cảnh 5 — Editor tools (20s):** Tóm tắt → kết quả chat → Chèn vào văn bản → không dư enter.

**Cảnh 6 — Rà soát (20s):** Mở VB-LOI-01 → Rà soát → thấy 7 lỗi → chấp nhận một lỗi.

**Cảnh 7 — Tra cứu (15s):** Vào Tra cứu AI → hỏi khai tử → confidence 96.7% → download mẫu đơn.

---

## Thông tin tài khoản và dữ liệu test

| Mục | Giá trị |
|---|---|
| URL local | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Email demo | demo@civicai.vn |
| Mật khẩu demo | Demo@2026 |
| VB-LOI-01 ID | 00588f4d-639b-4b5d-afbb-61e4bc014f82 |
| VB-SS-01 ID | 24ee1e76-345c-4327-950d-7f9eb34a74db |
| VB-SS-02 ID | 3098a853-230d-41f4-9182-f70c82882df3 |
| Kho tri thức | 272 văn bản, 7.525 chunks |
| LLM | Groq llama-3.3-70b-versatile |
