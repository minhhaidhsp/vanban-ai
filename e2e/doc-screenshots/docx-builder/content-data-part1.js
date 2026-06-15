// content-data.js (phần 1/4) — Cổng công dân, Đăng nhập, Tổng quan
// Mỗi phân hệ: { title, intro, images: [{ order, heading, body }] }
// "order" phải khớp với "order" trong manifest.json để map đúng ảnh.

const CHAPTERS_PART1 = [
  {
    title: "1. Cổng thông tin công dân",
    intro:
      "Cổng thông tin công dân là trang công khai của hệ thống CivicAI, " +
      "nơi người dân có thể tìm hiểu về dịch vụ và đặt câu hỏi về thủ tục " +
      "hành chính thông qua trợ lý ảo (chatbot) tích hợp sẵn, không cần " +
      "đăng nhập.",
    images: [
      {
        order: 1,
        heading: "1.1. Trang chủ",
        body:
          "Khi truy cập vào địa chỉ của hệ thống, người dùng sẽ thấy trang " +
          "chủ giới thiệu tổng quan về CivicAI: tên hệ thống, mô tả ngắn về " +
          "chức năng hỗ trợ hành chính công bằng trí tuệ nhân tạo, và các " +
          "số liệu thống kê (số văn bản, số đoạn nội dung trong kho tri " +
          "thức, độ chính xác, số tác tử AI).",
      },
      {
        order: 2,
        heading: "1.2. Các tính năng chính",
        body:
          "Cuộn xuống trang chủ, hệ thống giới thiệu các nhóm tính năng " +
          "chính dành cho cán bộ công chức: soạn thảo văn bản theo Nghị " +
          "định 30/2020/NĐ-CP, tra cứu văn bản pháp lý bằng AI, các công cụ " +
          "hỗ trợ rà soát và chuẩn hóa văn bản.",
      },
      {
        order: 3,
        heading: "1.3. Mở trợ lý ảo (ChatWidget)",
        body:
          "Ở góc dưới bên phải màn hình luôn có một nút tròn mở trợ lý ảo. " +
          "Người dân click vào nút này để mở cửa sổ chat hỏi đáp về thủ tục " +
          "hành chính. Cửa sổ chat hiện ra với lời chào mặc định và khung " +
          "nhập câu hỏi ở phía dưới.",
      },
      {
        order: 4,
        heading: "1.4. Đặt câu hỏi cho trợ lý ảo",
        body:
          "Người dân nhập câu hỏi vào khung chat, ví dụ: \u201CThủ tục đăng " +
          "ký khai sinh cần giấy tờ gì?\u201D. Sau khi gửi, trợ lý ảo sẽ trả " +
          "lời theo cấu trúc rõ ràng: hồ sơ cần nộp, trình tự thực hiện, " +
          "thời gian giải quyết, nơi nộp hồ sơ, lệ phí, và các lưu ý quan " +
          "trọng \u2014 kèm trích dẫn nguồn từ văn bản pháp luật liên quan.",
      },
    ],
  },

  {
    title: "2. Đăng ký và đăng nhập",
    intro:
      "Cán bộ công chức cần có tài khoản để sử dụng các tính năng nghiệp " +
      "vụ của CivicAI (soạn thảo, tra cứu AI, quản lý kho văn bản...). Phần " +
      "này hướng dẫn đăng nhập vào hệ thống.",
    images: [
      {
        order: 5,
        heading: "2.1. Trang đăng nhập",
        body:
          "Truy cập trang đăng nhập của hệ thống. Giao diện được chia thành " +
          "2 cột: bên trái là hình ảnh/giới thiệu về CivicAI, bên phải là " +
          "biểu mẫu đăng nhập gồm 2 trường: Email và Mật khẩu.",
      },
      {
        order: 6,
        heading: "2.2. Nhập thông tin và đăng nhập",
        body:
          "Nhập email và mật khẩu đã được cấp, sau đó nhấn nút \u201CĐăng " +
          "nhập\u201D (được tô màu rõ ràng). Nếu thông tin đăng nhập đúng, " +
          "hệ thống sẽ chuyển sang trang Tổng quan của khu vực làm việc. " +
          "Nếu sai mật khẩu, hệ thống sẽ hiển thị thông báo lỗi để người " +
          "dùng nhập lại.",
      },
      {
        order: 7,
        heading: "2.3. Vào trang Tổng quan",
        body:
          "Đăng nhập thành công, hệ thống tự động chuyển đến trang Tổng " +
          "quan với 4 thẻ chỉ số (metric card) ở phía trên và một bảng " +
          "tổng hợp Kho tri thức ngay bên dưới.",
      },
    ],
  },

  {
    title: "3. Trang Tổng quan",
    intro:
      "Trang Tổng quan là màn hình chính của khu vực làm việc, hiển thị " +
      "các số liệu thống kê và là điểm khởi đầu để điều hướng đến các " +
      "phân hệ khác.",
    images: [
      {
        order: 8,
        heading: "3.1. Số liệu Kho tri thức",
        body:
          "Trang Tổng quan hiển thị các thẻ thống kê: số lượng văn bản đã " +
          "soạn, và đặc biệt là thông tin Kho tri thức \u2014 hiện có 272 " +
          "văn bản pháp luật, tương đương 7.525 đoạn nội dung, đạt độ phủ " +
          "93% so với các thủ tục hành chính cấp xã/phường. Đây là nguồn " +
          "dữ liệu mà AI sử dụng để tra cứu và hỗ trợ soạn thảo.",
      },
      {
        order: 9,
        heading: "3.2. Menu điều hướng",
        body:
          "Phía bên trái màn hình là menu điều hướng chính, được chia thành " +
          "3 nhóm:\n" +
          "\u2022 NGHIỆP VỤ: Tổng quan, Tài liệu, Tra cứu AI \u2014 các chức " +
          "năng sử dụng hàng ngày.\n" +
          "\u2022 KHO TRI THỨC: Kho văn bản, OCR Văn bản \u2014 quản lý " +
          "nguồn dữ liệu tham chiếu cho AI.\n" +
          "\u2022 HỆ THỐNG: Tài khoản, Cài đặt, Quản lý User \u2014 các thiết " +
          "lập cá nhân và quản trị.\n\n" +
          "Menu này có thể thu gọn lại thành một dải biểu tượng hẹp bằng " +
          "cách nhấn vào nút mũi tên ở góc trên, giúp có thêm không gian " +
          "làm việc khi cần.",
      },
    ],
  },
];

module.exports = { CHAPTERS_PART1 };