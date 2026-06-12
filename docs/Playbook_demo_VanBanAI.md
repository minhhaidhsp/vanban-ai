# Playbook demo và bộ dữ liệu test — VănBản.AI

Tài liệu chuẩn bị cho buổi báo cáo trước hội đồng. Mục tiêu là mọi thao tác demo đều có dữ liệu đầu vào chính xác và kết quả mong đợi rõ ràng, để buổi demo chạy đúng và chụp được 28 ảnh trình diễn tính năng.

## 1. Nguyên tắc

- Mọi đầu vào demo đều cố định và đã chuẩn bị trước, không gõ ngẫu hứng tại hội trường.
- Ưu tiên dùng kho tri thức sẵn có. Phần nào kho chưa phủ thì nạp bổ sung theo mục 2.
- Mỗi test case gắn với một hoặc nhiều ảnh trong bộ slide, xem bảng ánh xạ ở mục 4.
- Có sẵn dữ liệu lỗi cố ý cho công cụ rà soát và kiểm tra định dạng, để hệ thống có cái mà phát hiện.

## 2. Dữ liệu cần chuẩn bị trước trong hệ thống

### 2.1. Kiểm tra kho tri thức

Trước demo, xác nhận trong kho 272 văn bản có Nghị định 30/2020/NĐ-CP về công tác văn thư, vì hai kịch bản tra cứu bám vào văn bản này. Nếu chưa có, tải lên trước.

Với cổng công dân, nên nạp thêm 2 đến 3 văn bản thủ tục chính thức như đăng ký khai sinh, chứng thực bản sao, lấy từ Cổng dịch vụ công, để câu trả lời có nguồn chính xác. Văn bản mẫu ở mục 2.3 chỉ là phương án dự phòng, nên thay bằng văn bản chính thức khi có.

### 2.2. VB-LOI-01 — Công văn có lỗi cố ý

Dùng cho công cụ Rà soát văn bản và Kiểm tra định dạng. Tạo một văn bản mới trong hệ thống và dán nguyên nội dung sau:

```
ỦY BAN NHÂN DÂN
PHƯỜNG BẾN THÀNH

Cộng hòa xã hội chủ nghĩa việt nam
Độc lập - Tự do - Hạnh phúc

Số:    /UBND
V/v tăng cường công tác vệ sinh môi trường

Kính gởi: Các tổ dân phố trên địa bàn phường

Thực hiện kế hoạch của Ủy ban nhân dân Thành phố về công tác vệ sinh môi trường,
nhằm bảo đảm cảnh quan sạch đẹp trước dịp tết nguyên đán, Ủy ban nhân dân phường
đề nghị các tổ dân phố thực hiện một số nội dung sau:

1. Tổ chức ra quân tổng vệ sinh đường phố vào ngày cuối tuần.
2. Vận động nhân dân không xã rác bừa bãi.
3. Báo cáo kết quả về Ủy ban nhân dân phường trước ngày 25 tháng 01.

Đề nghị các tổ dân phố nghiêm túc triển khai thực hiện./.

Nơi nhận:                                  TM. ỦY BAN NHÂN DÂN
- Như trên;                                CHỦ TICH
- Lưu: VT.
```

Các lỗi cố ý mà hệ thống cần phát hiện, dùng để đối chiếu khi demo:

1. Quốc hiệu viết thường, đúng phải là CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM.
2. Thiếu số thứ tự và ký hiệu trong dòng Số, đúng dạng Số: .../CV-UBND.
3. Thiếu địa danh và ngày tháng năm ban hành.
4. Lỗi chính tả Kính gởi, đúng là Kính gửi.
5. Sai chữ hoa tết nguyên đán, đúng là Tết Nguyên đán.
6. Lỗi chính tả không xã rác, đúng là không xả rác.
7. Lỗi chính tả CHỦ TICH, đúng là CHỦ TỊCH.

### 2.3. TT-01 — Tài liệu thủ tục mẫu (phương án dự phòng cho cổng công dân)

Nội dung minh họa, nên thay bằng văn bản chính thức khi có. Tải lên kho tri thức dưới dạng tài liệu tham chiếu:

```
THỦ TỤC ĐĂNG KÝ KHAI SINH

1. Trình tự thực hiện
Người dân nộp hồ sơ tại bộ phận một cửa của Ủy ban nhân dân cấp xã nơi cư trú.
Công chức tư pháp hộ tịch tiếp nhận, kiểm tra hồ sơ và thực hiện đăng ký.

2. Thành phần hồ sơ
- Tờ khai đăng ký khai sinh theo mẫu.
- Giấy chứng sinh. Trường hợp không có giấy chứng sinh thì nộp văn bản xác nhận của người làm chứng hoặc giấy cam đoan về việc sinh.
- Giấy tờ tùy thân của người đi đăng ký.

3. Thời hạn giải quyết
Giải quyết ngay trong ngày làm việc. Trường hợp cần xác minh thì không quá 05 ngày làm việc.

4. Lệ phí
Miễn lệ phí đối với đăng ký khai sinh đúng hạn.
```

### 2.4. VB-SS-01 và VB-SS-02 — Hai phiên bản để so sánh

Dùng cho công cụ So sánh văn bản. Tạo VB-SS-02 làm văn bản đang mở, ghim VB-SS-01 làm tài liệu tham chiếu.

VB-SS-01, đoạn nội dung bản cũ:

```
Đề nghị các tổ dân phố tổ chức tổng vệ sinh vào ngày cuối tuần và báo cáo kết quả
về Ủy ban nhân dân phường trước ngày 25 tháng 01 năm 2026.
```

VB-SS-02, đoạn nội dung bản mới:

```
Đề nghị các tổ dân phố tổ chức tổng vệ sinh vào sáng thứ Bảy hằng tuần trong tháng 01
và báo cáo kết quả về Ủy ban nhân dân phường trước ngày 20 tháng 01 năm 2026.
```

## 3. Bộ test case theo kịch bản

### Kịch bản A — Soạn thảo và rà soát

A1. Soạn thảo văn bản bằng AI
- Mục tiêu: thể hiện tác tử Soạn thảo tạo văn bản đúng thể thức.
- Đầu vào, loại văn bản Công văn, yêu cầu dán nguyên: `Soạn công văn của Ủy ban nhân dân phường gửi các tổ dân phố về việc tăng cường công tác vệ sinh môi trường, tổ chức tổng vệ sinh trước Tết Nguyên đán và báo cáo kết quả trước ngày 25 tháng 01.`
- Thao tác: mở chức năng tạo văn bản AI, chọn loại Công văn, nhập yêu cầu, tạo.
- Kết quả mong đợi: văn bản có đủ quốc hiệu, tiêu ngữ, số ký hiệu, trích yếu, nội dung ba ý, nơi nhận, đúng thể thức.

A2. Rà soát văn bản
- Mục tiêu: thể hiện tác tử Rà soát phát hiện lỗi và đề xuất sửa dạng theo dõi thay đổi.
- Đầu vào: mở VB-LOI-01 ở mục 2.2.
- Thao tác: mở công cụ Rà soát văn bản, chạy rà soát, duyệt từng đề xuất, chấp nhận vài đề xuất, nhấp một đề xuất để hệ thống định vị đoạn lỗi.
- Kết quả mong đợi: hệ thống liệt kê các lỗi ở mục 2.2, cho chấp nhận hoặc bỏ qua từng lỗi, định vị và tô sáng đúng đoạn.

### Kịch bản B — Tra cứu tri thức hành chính

Câu hỏi đã được đo thực tế trên kho 7.525 chunks, DB local UBND Phường Nhiêu Lộc TP.HCM. Chỉ dùng các câu trong bảng, không thay thế ngẫu hứng.

B1 — câu chính: `Đăng ký khai tử thực hiện như thế nào?` — confidence 96.7%
B2 — câu chính: `Cấp bản sao trích lục hộ tịch cần gì?` — confidence 95.0%
B3 — câu chính: `Thủ tục đăng ký kết hôn gồm những gì?` — confidence 93.3%
B4 — dự phòng: `Đăng ký khai sinh cần những giấy tờ gì?` — confidence 92.2%
B5 — dự phòng: `Thời hạn giải quyết đăng ký khai sinh là bao lâu?` — confidence 90.4%

Kịch bản demo: dùng B1 và B3 liên tiếp, cho hội đồng thấy hai loại thủ tục khác nhau đều ra kết quả có trích dẫn nguồn và chỉ số tin cậy trên 93 phần trăm.

TUYỆT ĐỐI không dùng ba câu sau vì kho thiếu dữ liệu: chứng thực bản sao, căn cước công dân, chứng thực chữ ký.

### Kịch bản C — Trợ giúp công dân

Câu hỏi đã được đo thực tế, dùng đúng cụm từ bên dưới khi demo, không paraphrase.

C1 — câu chính: `Đăng ký khai sinh cần những giấy tờ gì?` — confidence 92.2%
C2 — câu chính: `Thủ tục đăng ký kết hôn gồm những gì?` — confidence 93.3%
C3 — dự phòng: `Thời hạn giải quyết đăng ký khai sinh là bao lâu?` — confidence 90.4%
C4 — dự phòng: `Đăng ký tạm trú thực hiện ở đâu và cần gì?` — confidence 89.1%

Kịch bản demo: dùng C1 cho cổng công dân, câu đơn giản, dễ hiểu, hội đồng thấy ngay giá trị với người dân. Câu C2 dùng dự phòng nếu C1 chậm.

### Công cụ trong tab Công cụ

T1. Tóm tắt nội dung
- Đầu vào: mở một văn bản dài bất kỳ, ví dụ văn bản đã soạn ở A1.
- Kết quả mong đợi: bản tóm tắt ba đến năm ý chính trong tab Chat AI.

T2. Hỏi đáp nội dung
- Đầu vào: mở văn bản ở A1, hỏi `Văn bản này yêu cầu báo cáo kết quả trước ngày nào?`
- Kết quả mong đợi: trả lời đúng mốc thời gian trong văn bản.

T3. Bảng số liệu
- Đầu vào, dán đoạn này vào văn bản trước khi chạy: `Trong quý I năm 2026, phường tiếp nhận 1.250 hồ sơ thủ tục hành chính, trong đó hộ tịch 520 hồ sơ, chứng thực 430 hồ sơ, đất đai 180 hồ sơ, lĩnh vực khác 120 hồ sơ. Tỷ lệ giải quyết đúng hạn đạt 96 phần trăm.`
- Kết quả mong đợi: một bảng số liệu dạng markdown theo lĩnh vực và số hồ sơ.

T4. Soạn thảo nhanh
- Đầu vào: mở văn bản A1 còn dở ở phần nội dung.
- Kết quả mong đợi: gợi ý đoạn nội dung tiếp theo phù hợp thể thức.

T5. Kiểm tra định dạng
- Đầu vào: mở VB-LOI-01.
- Kết quả mong đợi: liệt kê các điểm chưa đúng thể thức theo Nghị định 30.

T6. Trích dẫn điều khoản
- Đầu vào, dán nguyên: `Tìm căn cứ pháp lý về thể thức trình bày văn bản hành chính.`
- Kết quả mong đợi: gợi ý điều khoản và văn bản liên quan kèm trích dẫn.

T7. Tạo mẫu văn bản
- Đầu vào: mở công cụ Tạo mẫu văn bản, chọn loại Quyết định.
- Kết quả mong đợi: mẫu Quyết định trống đúng thể thức, các phần cần điền có ghi chú hướng dẫn.

T8. So sánh văn bản
- Đầu vào: mở VB-SS-02, ghim VB-SS-01 làm tài liệu tham chiếu, chạy So sánh.
- Kết quả mong đợi: nêu điểm khác nhau về thời gian thực hiện và mốc báo cáo.

## 4. Ánh xạ test case sang ảnh slide

| Test case | Slide ảnh tương ứng |
|---|---|
| A1 | Trình soạn thảo và tạo văn bản AI, slide 25 đến 27 |
| A2 | Rà soát và theo dõi thay đổi, slide 29 đến 31 |
| B1, B2 | Tra cứu và trích dẫn, slide 33 đến 35 |
| C1, C2 | Cổng công dân, slide 42 đến 43 |
| T1, T2 | Tóm tắt và hỏi đáp, slide 38 |
| T3, T4 | Lưới công cụ, slide 37 |
| T5 | Kiểm tra định dạng, slide 39 |
| T6 | Trích dẫn điều khoản, slide 39 |
| T7, T8 | Tạo mẫu và so sánh, slide 40 |

## 5. Danh sách kiểm tra trước buổi demo

1. Xác nhận Nghị định 30 đã có trong kho tri thức.
2. Nạp tài liệu thủ tục cho cổng công dân, ưu tiên văn bản chính thức.
3. Tạo sẵn VB-LOI-01, VB-SS-01, VB-SS-02 trong hệ thống.
4. Chạy thử lần lượt toàn bộ A, B, C và T1 đến T8, ghi nhận kết quả.
5. Chụp lại các màn hình theo bảng mục 4.
6. Quay video kịch bản A1 sang A2 sang B1 thành một mạch liền cho slide 45.
7. Chuẩn bị mô hình chạy ổn định trên local để tránh lỗi khóa Gemini trên production.

## 6. Tùy chọn, prompt Claude Code để nạp dữ liệu test

Lưu file này vào trong dự án trước, ví dụ `docs/Playbook_demo_VanBanAI.md`, để Claude Code đọc được. Sau đó dùng prompt:

```
Nhiệm vụ: nạp dữ liệu test cho demo. CHỈ thêm dữ liệu, KHÔNG sửa logic ứng dụng.

ĐỌC TRƯỚC:
- File docs/Playbook_demo_VanBanAI.md để lấy nội dung VB-LOI-01, VB-SS-01, VB-SS-02, TT-01.
- Cách tạo document trong hệ thống: xác định content lưu dạng nd30 JSON hay text, gồm các field nào (quốc hiệu, tiêu ngữ, số ký hiệu, trích yếu, nội dung, nơi nhận, chức vụ ký).
- Cách tải tài liệu tham chiếu vào kho tri thức.

SAU KHI HIỂU CẤU TRÚC:
1. Tạo document "VB-LOI-01" với nội dung mục 2.2, map đúng vào các field nd30. GIỮ NGUYÊN mọi lỗi chính tả và thể thức, tuyệt đối không tự sửa.
2. Tạo document "VB-SS-01" và "VB-SS-02" với hai đoạn nội dung mục 2.4, đặt vào field nội dung.
3. Nếu kho chưa có văn bản thủ tục tương đương, tải nội dung mục 2.3 vào kho tài liệu tham chiếu.

Báo lại id các bản ghi đã tạo. Không commit, để tôi kiểm tra.
```

## 7. ID document test đã tạo trong DB local

| Tên | ID | Ghi chú |
|---|---|---|
| VB-LOI-01 | 00588f4d-639b-4b5d-afbb-61e4bc014f82 | Công văn 7 lỗi cố ý, loai_vb=CV, toàn bộ nội dung lỗi nhúng vào noiDung dạng HTML |
| VB-SS-01 | 24ee1e76-345c-4327-950d-7f9eb34a74db | Bản cũ: "ngày cuối tuần", mốc "25/01" |
| VB-SS-02 | 3098a853-230d-41f4-9182-f70c82882df3 | Bản mới: "sáng thứ Bảy", mốc "20/01" |

Lưu ý khi demo Rà soát và Kiểm tra định dạng:
Mở VB-LOI-01, KHÔNG chỉnh sửa gì trước khi chạy công cụ.
Toàn bộ lỗi nằm trong trường noiDung dạng HTML vì
_extract_tiptap_text() chỉ đọc trichYeu + canCu + noiDung + noiNhan.
Nếu sửa tay trước thì hệ thống không còn lỗi để phát hiện.
