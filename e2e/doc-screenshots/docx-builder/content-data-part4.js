// content-data-part4.js — Kho văn bản, OCR, Tài khoản/Cài đặt, Quản lý User
// orders 35-50

const CHAPTERS_PART4 = [
  {
    title: "7. Kho tri thức",
    intro:
      "Kho tri thức là nơi lưu trữ các văn bản pháp luật, quy định, thủ " +
      "tục hành chính được dùng làm nguồn tham chiếu cho AI khi tra cứu " +
      "và hỗ trợ soạn thảo. Đây chính là cơ sở dữ liệu giúp các câu trả " +
      "lời của AI có căn cứ và trích dẫn chính xác.",
    images: [
      {
        order: 35,
        heading: "7.1. Danh sách văn bản tham chiếu",
        body:
          "Trang Kho tri thức hiển thị tổng số văn bản và số đoạn nội dung " +
          "đã được số hóa (ví dụ: 272 văn bản, 7.525 đoạn). Danh sách được " +
          "chia theo 3 tab: \u201CCủa tôi\u201D (văn bản do cán bộ tự tải " +
          "lên), \u201CCơ quan\u201D (văn bản chung của đơn vị), và " +
          "\u201CHệ thống\u201D (văn bản do quản trị hệ thống cung cấp).",
      },
      {
        order: 36,
        heading: "7.2. Tìm kiếm và lọc văn bản",
        body:
          "Phía trên danh sách có ô tìm kiếm theo tên văn bản, và 2 bộ " +
          "lọc: theo loại văn bản và theo hiệu lực (còn hiệu lực/hết hiệu " +
          "lực). Việc lọc giúp cán bộ nhanh chóng tìm đúng văn bản cần " +
          "tham khảo trong kho dữ liệu lớn.",
      },
      {
        order: 37,
        heading: "7.3. Thêm văn bản vào kho tri thức",
        body:
          "Có 2 cách để bổ sung văn bản vào kho tri thức:\n" +
          "\u2022 \u201CUpload hàng loạt (AI)\u201D \u2014 tải lên nhiều " +
          "file cùng lúc, AI sẽ tự động đọc, phân loại và số hóa nội dung.\n" +
          "\u2022 \u201CNhập thủ công\u201D \u2014 nhập thông tin và nội " +
          "dung văn bản trực tiếp.\n\n" +
          "Sau khi thêm, văn bản sẽ được xử lý và đưa vào kho để AI có thể " +
          "sử dụng khi tra cứu hoặc soạn thảo.",
      },
    ],
  },

  {
    title: "8. OCR văn bản",
    intro:
      "Tính năng OCR (nhận diện ký tự quang học) cho phép trích xuất nội " +
      "dung văn bản từ file PDF hoặc ảnh chụp, giúp số hóa các văn bản " +
      "giấy hoặc file scan thành văn bản có thể chỉnh sửa được.",
    images: [
      {
        order: 38,
        heading: "8.1. Tải file lên để OCR",
        body:
          "Tại trang OCR, kéo thả hoặc click vào khung để chọn file cần " +
          "xử lý. Hệ thống hỗ trợ PDF văn bản (PDF có lớp chữ, trích xuất " +
          "trực tiếp), PDF dạng hình ảnh/scan (cần nhận diện ký tự), và " +
          "file ảnh (JPG, PNG). Hệ thống sẽ tự động nhận diện loại file để " +
          "chọn phương pháp xử lý phù hợp.",
      },
      {
        order: 39,
        heading: "8.2. Đang xử lý \u2014 PDF văn bản",
        body:
          "Với file PDF có sẵn lớp chữ (text layer), hệ thống trích xuất " +
          "nội dung trực tiếp mà không cần nhận diện ảnh, nên xử lý rất " +
          "nhanh (thường dưới 15 giây). Quá trình xử lý hiển thị thanh " +
          "tiến trình ngay trên màn hình.",
      },
      {
        order: 40,
        heading: "8.3. Kết quả \u2014 PDF văn bản",
        body:
          "Sau khi hoàn tất, hệ thống hiển thị: số trang, số ký tự đã " +
          "trích xuất, và nội dung văn bản kèm bản xem trước file PDF gốc " +
          "để đối chiếu. Với PDF có lớp chữ, độ chính xác của nội dung " +
          "trích xuất rất cao vì không phụ thuộc vào nhận diện hình ảnh.",
      },
      {
        order: 41,
        heading: "8.4. Đang xử lý \u2014 PDF hình ảnh (scan)",
        body:
          "Với file dạng hình ảnh hoặc bản scan (không có lớp chữ sẵn), " +
          "hệ thống sử dụng công nghệ nhận diện ký tự (OCR) để \u201Cđọc" +
          "\u201D từng trang. Quá trình này hiển thị tiến độ theo số " +
          "trang và mất nhiều thời gian hơn so với PDF văn bản, đặc biệt " +
          "với file nhiều trang.\n\n" +
          "Lưu ý: ví dụ minh họa trong tài liệu này sử dụng một file PDF " +
          "đã có lớp chữ (chữ ký số), nên hệ thống nhận diện và xử lý theo " +
          "luồng PDF văn bản (nhanh hơn). Với file scan thật (ảnh chụp " +
          "không có lớp chữ), luồng xử lý OCR ảnh sẽ hiển thị tiến trình " +
          "theo từng trang như mô tả ở trên.",
      },
      {
        order: 42,
        heading: "8.5. Kết quả \u2014 PDF hình ảnh",
        body:
          "Sau khi OCR hoàn tất, nội dung nhận diện được hiển thị để cán " +
          "bộ kiểm tra và chỉnh sửa lại nếu có ký tự nhận diện chưa chính " +
          "xác (thường gặp với chữ viết tay hoặc bản scan chất lượng " +
          "thấp), trước khi đưa vào trình soạn thảo.",
      },
      {
        order: 43,
        heading: "8.6. Danh sách các file đã xử lý",
        body:
          "Quay lại trang danh sách OCR, cán bộ có thể xem lại tất cả các " +
          "file đã xử lý, trạng thái (Hoàn tất/Đang xử lý/Lỗi), và mở lại " +
          "kết quả để tải nội dung vào trình soạn thảo bất cứ lúc nào.",
      },
    ],
  },

  {
    title: "9. Tài khoản & Cài đặt",
    intro:
      "Phần Tài khoản và Cài đặt cho phép cán bộ cập nhật thông tin cá " +
      "nhân, đổi mật khẩu, và thiết lập thông tin đơn vị cùng chữ ký mặc " +
      "định để sử dụng khi soạn văn bản.",
    images: [
      {
        order: 44,
        heading: "9.1. Thông tin cá nhân",
        body:
          "Tại trang Tài khoản, cán bộ có thể xem và cập nhật họ tên hiển " +
          "thị. Địa chỉ email được dùng để đăng nhập nên không thể thay " +
          "đổi. Sau khi sửa thông tin, nhấn \u201CLưu thay đổi\u201D để áp " +
          "dụng.",
      },
      {
        order: 45,
        heading: "9.2. Đổi mật khẩu",
        body:
          "Để đổi mật khẩu, nhập mật khẩu hiện tại, sau đó nhập mật khẩu " +
          "mới và xác nhận lại mật khẩu mới. Nhấn \u201CĐổi mật khẩu\u201D " +
          "để hoàn tất. Nên đổi mật khẩu định kỳ và đặt mật khẩu đủ mạnh " +
          "để bảo vệ tài khoản.",
      },
      {
        order: 46,
        heading: "9.3. Thông tin đơn vị",
        body:
          "Tại trang Cài đặt, cán bộ (có quyền phù hợp) thiết lập thông " +
          "tin của đơn vị mình: tên cơ quan chủ quản (ví dụ: Ủy ban nhân " +
          "dân Thành phố Thủ Đức), tên cơ quan ban hành (ví dụ: Ủy ban " +
          "nhân dân Phường An Phú), tên viết tắt, và địa danh. Các thông " +
          "tin này sẽ được tự động điền vào phần quốc hiệu của mọi văn " +
          "bản mới được tạo.",
      },
      {
        order: 47,
        heading: "9.4. Chữ ký mặc định",
        body:
          "Cũng tại trang Cài đặt, cán bộ thiết lập thông tin chữ ký mặc " +
          "định sẽ tự động điền vào phần ký của văn bản mới: quyền hạn ký " +
          "(TM., KT., TL., TUQ.), chức danh tập thể (ví dụ: Ủy ban nhân " +
          "dân), và chức vụ của người ký. Việc thiết lập trước giúp tiết " +
          "kiệm thời gian khi soạn nhiều văn bản.",
      },
    ],
  },

  {
    title: "10. Quản lý người dùng & Đăng xuất",
    intro:
      "Phần này dành cho quản trị viên (admin), cho phép quản lý danh " +
      "sách cán bộ sử dụng hệ thống. Phần cuối hướng dẫn cách đăng xuất " +
      "khỏi hệ thống.",
    images: [
      {
        order: 48,
        heading: "10.1. Danh sách người dùng",
        body:
          "Trang Quản lý người dùng (chỉ admin truy cập được) hiển thị " +
          "danh sách toàn bộ cán bộ trong hệ thống, gồm: họ tên, email, " +
          "phân quyền (admin/leader/staff), trạng thái hoạt động, và các " +
          "thao tác quản lý.",
      },
      {
        order: 49,
        heading: "10.2. Đổi phân quyền và trạng thái",
        body:
          "Với mỗi người dùng (trừ chính tài khoản admin đang đăng nhập), " +
          "quản trị viên có thể: đổi vai trò (admin/leader/staff) thông " +
          "qua ô chọn có màu phân biệt theo vai trò, khóa hoặc mở lại tài " +
          "khoản (chuyển trạng thái Hoạt động/Bị khóa), hoặc xóa tài " +
          "khoản (có hộp thoại xác nhận trước khi xóa để tránh xóa " +
          "nhầm).",
      },
      {
        order: 50,
        heading: "10.3. Đăng xuất",
        body:
          "Để kết thúc phiên làm việc, nhấn nút \u201CĐăng xuất\u201D ở " +
          "cuối menu điều hướng bên trái. Hệ thống sẽ đưa người dùng về " +
          "trang đăng nhập. Nên đăng xuất khi sử dụng máy tính chung hoặc " +
          "kết thúc ca làm việc để bảo đảm an toàn thông tin.",
      },
    ],
  },
];

module.exports = { CHAPTERS_PART4 };