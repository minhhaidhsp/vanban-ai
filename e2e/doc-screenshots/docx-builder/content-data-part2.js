// content-data-part2.js — Quản lý Tài liệu, Soạn thảo văn bản (Editor)
// orders 10-23

const CHAPTERS_PART2 = [
  {
    title: "4. Quản lý Tài liệu",
    intro:
      "Phân hệ Tài liệu là nơi lưu trữ và quản lý toàn bộ văn bản mà cán " +
      "bộ đã soạn. Từ đây, cán bộ có thể xem lại các văn bản cũ hoặc bắt " +
      "đầu soạn một văn bản mới theo 1 trong 3 cách.",
    images: [
      {
        order: 10,
        heading: "4.1. Danh sách văn bản",
        body:
          "Trang Tài liệu hiển thị danh sách tất cả văn bản đã tạo, gồm " +
          "tên văn bản, loại văn bản (Công văn, Quyết định, Thông báo, Kế " +
          "hoạch...), ngày tạo, và các nút thao tác (mở, đổi tên, xóa). " +
          "Cán bộ có thể tìm kiếm hoặc sắp xếp danh sách để dễ dàng tìm " +
          "lại văn bản đã soạn trước đó.",
      },
      {
        order: 11,
        heading: "4.2. Tạo văn bản mới",
        body:
          "Để bắt đầu soạn một văn bản mới, nhấn nút \u201CTạo văn bản " +
          "mới\u201D ở góc trên của trang Danh sách văn bản. Hệ thống sẽ " +
          "mở màn hình lựa chọn (gọi là WelcomePanel) với 3 cách khởi tạo " +
          "khác nhau, được trình bày trong các mục tiếp theo.",
      },
      {
        order: 12,
        heading: "4.3. Cách 1 \u2014 Chọn theo mẫu (template)",
        body:
          "Tab \u201CChọn template\u201D hiển thị 18 loại văn bản hành " +
          "chính theo Nghị định 30/2020/NĐ-CP (Công văn, Quyết định, Thông " +
          "báo, Kế hoạch, Tờ trình, Báo cáo...). Cán bộ chỉ cần click vào " +
          "loại văn bản phù hợp, hệ thống sẽ tạo ngay một văn bản trống với " +
          "cấu trúc, bố cục và các thành phần đúng quy định cho loại văn " +
          "bản đó (quốc hiệu, số ký hiệu, trích yếu, nơi nhận, chữ ký...).",
      },
      {
        order: 13,
        heading: "4.4. Cách 2 \u2014 Tạo bằng AI",
        body:
          "Tab \u201CTạo bằng AI\u201D cho phép cán bộ mô tả yêu cầu bằng " +
          "ngôn ngữ tự nhiên, ví dụ: \u201CSoạn thông báo về việc nghỉ lễ " +
          "Quốc khánh 2/9 cho cán bộ, công chức UBND phường...\u201D. AI sẽ " +
          "tự động soạn toàn bộ nội dung văn bản, đúng văn phong hành " +
          "chính và đúng thể thức Nghị định 30, cán bộ chỉ cần kiểm tra và " +
          "chỉnh sửa lại cho phù hợp với thực tế.",
      },
      {
        order: 14,
        heading: "4.5. Cách 3 \u2014 Bắt đầu với trang trắng",
        body:
          "Tab \u201CTrang trắng\u201D tạo một văn bản hoàn toàn trống để " +
          "cán bộ tự soạn từ đầu. Ngoài ra, ở tab này, cán bộ có thể tải " +
          "lên (upload) một file PDF, Word hoặc ảnh chụp văn bản đã có " +
          "sẵn \u2014 hệ thống sẽ tự động nhận diện chữ (OCR) và đưa nội " +
          "dung vào trình soạn thảo để chỉnh sửa tiếp.",
      },
    ],
  },

  {
    title: "5. Soạn thảo văn bản",
    intro:
      "Trình soạn thảo là khu vực làm việc chính, nơi cán bộ biên tập nội " +
      "dung văn bản theo đúng thể thức Nghị định 30/2020/NĐ-CP, đồng thời " +
      "sử dụng các công cụ AI để hỗ trợ rà soát, tóm tắt, tra cứu căn cứ " +
      "pháp lý và nhiều tác vụ khác.",
    images: [
      {
        order: 15,
        heading: "5.1. Giao diện tổng quan",
        body:
          "Màn hình soạn thảo được chia thành 3 khu vực:\n" +
          "\u2022 Cột trái: Tài liệu tham chiếu \u2014 các văn bản pháp lý " +
          "liên quan đến nội dung đang soạn.\n" +
          "\u2022 Khu vực giữa: Nội dung văn bản, trình bày theo đúng thể " +
          "thức Nghị định 30 (quốc hiệu, tiêu ngữ, số ký hiệu, trích yếu, " +
          "nội dung, nơi nhận, chữ ký).\n" +
          "\u2022 Cột phải: Bảng công cụ AI hỗ trợ soạn thảo.\n\n" +
          "Cả 2 cột trái và phải đều có thể kéo để thay đổi độ rộng cho " +
          "phù hợp với màn hình.",
      },
      {
        order: 16,
        heading: "5.2. Thanh công cụ định dạng",
        body:
          "Phía trên khu vực soạn thảo là thanh công cụ định dạng văn bản, " +
          "gồm các nút: in đậm, in nghiêng, gạch chân, gạch ngang, danh " +
          "sách (có thứ tự/không thứ tự), căn lề (trái/giữa/phải/đều), tô " +
          "màu nổi bật, hoàn tác/làm lại (Undo/Redo), cùng 2 ô chọn font " +
          "chữ và giãn dòng. Ngay dưới thanh công cụ là thước canh lề giúp " +
          "điều chỉnh khoảng cách lề của từng đoạn văn bản.",
      },
      {
        order: 17,
        heading: "5.3. Tài liệu tham chiếu",
        body:
          "Cột bên trái hiển thị các văn bản pháp lý có liên quan đến nội " +
          "dung đang soạn (ví dụ: các nghị định, thông tư được trích dẫn). " +
          "Cán bộ có thể xem nhanh nội dung các văn bản này để đối chiếu " +
          "trong khi soạn thảo, không cần mở thêm tab hoặc tìm kiếm bên " +
          "ngoài. Độ rộng của cột này có thể kéo để thay đổi.",
      },
      {
        order: 18,
        heading: "5.4. Các công cụ AI hỗ trợ soạn thảo",
        body:
          "Cột bên phải gồm 9 công cụ AI, được nhóm theo màu sắc theo công " +
          "việc:\n" +
          "\u2022 Nhóm xanh teal (Rà soát, Chuẩn thể thức, Chuẩn văn phong): " +
          "kiểm tra và đề xuất sửa lỗi trực tiếp trên văn bản (theo cơ chế " +
          "theo dõi thay đổi \u2014 track changes).\n" +
          "\u2022 Nhóm xanh blue (Tóm tắt, Bảng số liệu, Gợi ý tiếp, Căn cứ " +
          "pháp lý): phân tích và trả kết quả trong khung chat.\n" +
          "\u2022 Nhóm vàng amber (So sánh): so sánh văn bản hiện tại với " +
          "một văn bản khác.\n" +
          "\u2022 Nhóm xám slate (Hỏi đáp): trò chuyện tự do với AI về bất " +
          "kỳ nội dung nào liên quan đến văn bản.",
      },
      {
        order: 19,
        heading: "5.5. Công cụ Căn cứ pháp lý",
        body:
          "Khi nhấn vào công cụ \u201CCăn cứ pháp lý\u201D, AI sẽ tự động " +
          "phân tích nội dung văn bản đang soạn, đối chiếu với kho tri " +
          "thức, và đề xuất các căn cứ pháp lý (tên văn bản, số ký hiệu, " +
          "điều khoản cụ thể) phù hợp để đưa vào phần \u201CCăn cứ\u201D của " +
          "văn bản. Kết quả hiển thị trong khung chat ở cột phải, kèm " +
          "trích dẫn nguồn rõ ràng.",
      },
      {
        order: 20,
        heading: "5.6. Tab Chat AI \u2014 Hỏi đáp tự do",
        body:
          "Tab \u201CChat AI\u201D cho phép cán bộ đặt câu hỏi tự do liên " +
          "quan đến văn bản đang soạn, ví dụ: \u201CVăn bản này cần gửi cho " +
          "cơ quan nào?\u201D. AI sẽ trả lời dựa trên nội dung văn bản và " +
          "kho tri thức. Lịch sử hỏi đáp được lưu lại trong phiên làm " +
          "việc, có thể xóa khi cần bắt đầu lại.",
      },
      {
        order: 21,
        heading: "5.7. Phần ký \u2014 Chọn quyền hạn ký",
        body:
          "Ở cuối văn bản là phần chữ ký. Cán bộ chọn quyền hạn ký phù hợp " +
          "với người sẽ ký văn bản:\n" +
          "\u2022 TM. (Thừa mệnh) \u2014 ký thừa mệnh tập thể (ví dụ: TM. Ủy " +
          "ban nhân dân).\n" +
          "\u2022 KT. (Ký thay) \u2014 cấp phó ký thay cấp trưởng.\n" +
          "\u2022 TL. (Thừa lệnh) \u2014 ký thừa lệnh.\n" +
          "\u2022 TUQ. (Thừa ủy quyền) \u2014 ký thừa ủy quyền.\n\n" +
          "Lựa chọn này sẽ tự động hiển thị đúng dòng chữ trước chức danh " +
          "người ký.",
      },
      {
        order: 22,
        heading: "5.8. Xem trước văn bản",
        body:
          "Nhấn nút \u201CXem trước\u201D để xem văn bản hiển thị đúng như " +
          "khi in trên khổ giấy A4, theo đúng tỷ lệ và định dạng thực tế. " +
          "Đây là bước kiểm tra cuối cùng trước khi xuất file, giúp phát " +
          "hiện các lỗi về bố cục, ngắt trang hoặc căn lề mà khi soạn thảo " +
          "có thể không nhận ra.",
      },
      {
        order: 23,
        heading: "5.9. Công cụ Rà soát văn bản",
        body:
          "Công cụ \u201CRà soát\u201D là một trong những công cụ quan " +
          "trọng nhất: AI sẽ đọc toàn bộ văn bản, tự động phát hiện các " +
          "lỗi về chính tả (ví dụ \u201CKính gởi\u201D thay vì \u201CKính " +
          "gửi\u201D, viết hoa sai như \u201CCHỦ TICH\u201D), lỗi thể thức, " +
          "và lỗi văn phong (câu chữ chưa trang trọng). Các đề xuất sửa lỗi " +
          "được hiển thị trực tiếp trên văn bản theo cơ chế theo dõi thay " +
          "đổi (track changes) \u2014 phần bị xóa được gạch ngang, phần " +
          "thêm mới được gạch chân, cán bộ có thể chấp nhận hoặc từ chối " +
          "từng đề xuất.",
      },
    ],
  },
];

module.exports = { CHAPTERS_PART2 };