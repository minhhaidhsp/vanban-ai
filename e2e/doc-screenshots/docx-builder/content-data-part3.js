// content-data-part3.js — Tra cứu AI
// orders 24-34

const CHAPTERS_PART3 = [
  {
    title: "6. Tra cứu AI",
    intro:
      "Tra cứu AI là công cụ hỏi đáp nghiệp vụ dành riêng cho cán bộ, " +
      "cho phép đặt câu hỏi bằng ngôn ngữ tự nhiên về các quy định pháp " +
      "luật, thủ tục hành chính, thẩm quyền, quy trình xử lý... Hệ thống " +
      "trả lời có cấu trúc rõ ràng, trích dẫn nguồn cụ thể, và ghi nhớ " +
      "lịch sử hội thoại để hiểu các câu hỏi nối tiếp.",
    images: [
      {
        order: 24,
        heading: "6.1. Giao diện Tra cứu AI",
        body:
          "Khi vào trang Tra cứu AI, menu điều hướng bên trái sẽ tự động " +
          "thu gọn để dành thêm không gian cho khung chat. Giao diện gồm " +
          "3 phần: cột trái là Lịch sử tra cứu (các cuộc hội thoại trước " +
          "đó), khu vực giữa là khung chat chính, và một vài câu hỏi gợi " +
          "ý hiển thị ở giữa khi chưa có cuộc hội thoại nào.",
      },
      {
        order: 25,
        heading: "6.2. Nhập câu hỏi",
        body:
          "Gõ câu hỏi vào khung nhập ở phía dưới, ví dụ: \u201CThẩm quyền " +
          "ban hành văn bản hành chính cấp phường, xã thuộc về ai?\u201D. " +
          "Khung nhập tự động giãn rộng theo số dòng nội dung. Nhấn Enter " +
          "để gửi câu hỏi, hoặc Shift+Enter để xuống dòng mà không gửi. " +
          "Bên cạnh nút gửi (mũi tên) còn có nút micro để nhập câu hỏi " +
          "bằng giọng nói.",
      },
      {
        order: 26,
        heading: "6.3. Hệ thống đang xử lý",
        body:
          "Sau khi gửi câu hỏi, hệ thống hiển thị tiến trình xử lý: tìm " +
          "kiếm trong kho văn bản, xếp hạng các kết quả liên quan, và " +
          "tổng hợp câu trả lời. Quá trình này thường mất vài giây tùy " +
          "độ phức tạp của câu hỏi.",
      },
      {
        order: 27,
        heading: "6.4. Câu trả lời có cấu trúc",
        body:
          "Câu trả lời được trình bày theo 5 mục rõ ràng (mục nào không " +
          "có thông tin liên quan sẽ được bỏ qua):\n" +
          "\u2022 Trả lời trực tiếp \u2014 tóm tắt ngắn gọn câu trả lời.\n" +
          "\u2022 Căn cứ pháp lý \u2014 tên văn bản, số ký hiệu và điều/" +
          "khoản cụ thể.\n" +
          "\u2022 Nội dung chi tiết \u2014 các bước, hồ sơ, quy trình liên " +
          "quan (nếu có).\n" +
          "\u2022 Thẩm quyền \u2014 cấp nào, ai có trách nhiệm thực hiện.\n" +
          "\u2022 Lưu ý nghiệp vụ \u2014 các trường hợp đặc biệt, điểm cần " +
          "chú ý.\n\n" +
          "Phía trên câu trả lời còn hiển thị Độ tin cậy (mức độ chính xác " +
          "của câu trả lời) và tỷ lệ trích dẫn/ngữ nghĩa khớp với nguồn dữ " +
          "liệu. Mỗi nhận định trong câu trả lời đều có số trích dẫn nhỏ " +
          "(ví dụ [1], [2]) để tham chiếu nguồn.",
      },
      {
        order: 28,
        heading: "6.5. Chi tiết câu trả lời",
        body:
          "Hình ảnh phóng to phần câu trả lời cho thấy rõ các số trích " +
          "dẫn [1][2]... được đặt ngay sau câu liên quan. Click vào số " +
          "trích dẫn bất kỳ sẽ mở thanh bên phải hiển thị chi tiết nguồn " +
          "tương ứng.",
      },
      {
        order: 29,
        heading: "6.6. Xem nguồn trích dẫn",
        body:
          "Khi click vào số trích dẫn (ví dụ [1]), một thanh bên (sidebar) " +
          "trượt ra từ phía bên phải, hiển thị: tên văn bản nguồn, số ký " +
          "hiệu, điều/khoản liên quan, và đoạn nội dung gốc được trích " +
          "dẫn. Có thể dùng nút \u201C\u2190 Trước\u201D / \u201CTiếp " +
          "\u2192\u201D để chuyển qua các nguồn khác trong cùng câu trả " +
          "lời. Đóng thanh bên bằng nút X ở góc trên.",
      },
      {
        order: 30,
        heading: "6.7. Chi tiết nguồn trích dẫn",
        body:
          "Hình ảnh phóng to thanh bên trích dẫn, cho thấy đầy đủ thông " +
          "tin: số thứ tự nguồn (ví dụ 1/5 nguồn), tên văn bản, điều " +
          "khoản, và nội dung đoạn văn bản gốc \u2014 giúp cán bộ tra cứu " +
          "tiếp nếu cần xem toàn văn.",
      },
      {
        order: 31,
        heading: "6.8. Hỏi tiếp theo ngữ cảnh (đa lượt hội thoại)",
        body:
          "Hệ thống ghi nhớ ngữ cảnh của cuộc hội thoại. Ví dụ, sau khi " +
          "hỏi về \u201Cthẩm quyền ban hành văn bản\u201D, cán bộ có thể " +
          "hỏi tiếp \u201CCụ thể UBND cấp xã được ban hành những loại văn " +
          "bản nào?\u201D mà không cần nhắc lại chủ đề \u2014 AI vẫn hiểu " +
          "đúng và trả lời trong cùng ngữ cảnh.",
      },
      {
        order: 32,
        heading: "6.9. Lịch sử tra cứu",
        body:
          "Cột bên trái lưu lại tất cả các cuộc tra cứu trước đó của cán " +
          "bộ, mỗi cuộc được đặt tên theo câu hỏi đầu tiên. Click vào một " +
          "cuộc tra cứu trong danh sách để xem lại toàn bộ nội dung hội " +
          "thoại đã trao đổi trước đó. Mỗi cán bộ chỉ thấy lịch sử tra " +
          "cứu của riêng mình.",
      },
      {
        order: 33,
        heading: "6.10. Thu gọn cột Lịch sử tra cứu",
        body:
          "Nếu cần thêm không gian cho khung chat, nhấn nút thu gọn ở góc " +
          "trên cột Lịch sử tra cứu để ẩn cột này. Khi đó chỉ còn một nút " +
          "nhỏ ở cạnh trái màn hình để mở lại cột Lịch sử khi cần.",
      },
      {
        order: 34,
        heading: "6.11. Bắt đầu cuộc tra cứu mới",
        body:
          "Để bắt đầu hỏi về một chủ đề khác, nhấn nút \u201CCuộc tra cứu " +
          "mới\u201D ở đầu cột Lịch sử tra cứu. Khung chat sẽ được làm " +
          "mới, và cuộc hội thoại hiện tại vẫn được lưu lại trong danh " +
          "sách lịch sử để xem lại sau.",
      },
    ],
  },
];

module.exports = { CHAPTERS_PART3 };