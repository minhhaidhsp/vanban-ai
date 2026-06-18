"""
Import 50 cặp Q&A hành chính công vào bảng qa_pairs.
Câu hỏi và câu trả lời dựa trên văn bản pháp luật VN.

Usage: python backend/scripts/import_qa_pairs.py
"""
import sys, asyncio, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

ADMIN_USER_ID = "fed370d0-268a-4210-80f7-493c8cf11cec"

# ── 50 cặp Q&A ───────────────────────────────────────────────────────────────
QA_DATA = [
    # ── HỘ TỊCH (1-10) ────────────────────────────────────────────────────────
    {
        "category": "ho_tich",
        "question": "Đăng ký khai sinh quá hạn 60 ngày có bị phạt không?",
        "answer": "Có. Theo Nghị định 82/2020/NĐ-CP, đăng ký khai sinh quá hạn 60 ngày tính từ ngày trẻ sinh ra bị phạt tiền từ 1.000.000 đến 3.000.000 đồng đối với cha, mẹ hoặc người thân thích. Thủ tục vẫn được thực hiện tại UBND cấp xã nơi cư trú của cha hoặc mẹ.",
        "can_cu": "Nghị định 82/2020/NĐ-CP Điều 28; Luật Hộ tịch 2014 Điều 14",
    },
    {
        "category": "ho_tich",
        "question": "Đăng ký khai sinh cần những giấy tờ gì?",
        "answer": "Hồ sơ gồm: (1) Tờ khai đăng ký khai sinh theo mẫu; (2) Giấy chứng sinh do cơ sở y tế cấp (nếu sinh tại nhà thì có văn bản xác nhận của người làm chứng); (3) Hộ chiếu/CCCD/Thẻ căn cước của người đi đăng ký; (4) Giấy chứng nhận kết hôn của cha mẹ (nếu có). Nộp tại UBND cấp xã nơi cư trú của cha hoặc mẹ, trong vòng 60 ngày từ ngày sinh.",
        "can_cu": "Luật Hộ tịch 2014 Điều 14, 15; Thông tư 04/2020/TT-BTP",
    },
    {
        "category": "ho_tich",
        "question": "Cha mẹ chưa đăng ký kết hôn thì khai sinh cho con như thế nào?",
        "answer": "Nếu cha mẹ chưa đăng ký kết hôn, mẹ đứng tên đăng ký khai sinh cho con. Họ tên cha có thể để trống hoặc ghi theo yêu cầu của mẹ nếu cha đến cùng và thừa nhận. Để ghi họ cha, cha phải làm thủ tục nhận con tại UBND cấp xã.",
        "can_cu": "Luật Hộ tịch 2014 Điều 15; Nghị định 123/2015/NĐ-CP Điều 12",
    },
    {
        "category": "ho_tich",
        "question": "Đăng ký khai tử cần những giấy tờ gì và thực hiện trong bao lâu?",
        "answer": "Hồ sơ gồm: (1) Tờ khai đăng ký khai tử; (2) Giấy báo tử hoặc giấy tờ thay thế (văn bản của cơ quan y tế, bản án/quyết định của tòa). Thời hạn: vợ/chồng, con, cha mẹ hoặc người thân thích phải đăng ký trong vòng 15 ngày kể từ ngày có người chết. Nộp tại UBND cấp xã nơi người chết cư trú hoặc nơi phát hiện thi thể.",
        "can_cu": "Luật Hộ tịch 2014 Điều 31, 32; Nghị định 82/2020/NĐ-CP",
    },
    {
        "category": "ho_tich",
        "question": "Đăng ký kết hôn cần những giấy tờ gì?",
        "answer": "Hồ sơ gồm: (1) Tờ khai đăng ký kết hôn theo mẫu; (2) CCCD/Hộ chiếu của hai người; (3) Giấy tờ chứng minh tình trạng hôn nhân (xác nhận độc thân từ UBND nơi cư trú nếu trước đó chưa kết hôn, hoặc bản án ly hôn nếu đã ly hôn). Thực hiện tại UBND cấp xã nơi cư trú của một trong hai bên, không mất lệ phí.",
        "can_cu": "Luật Hộ tịch 2014 Điều 17, 18; Nghị định 123/2015/NĐ-CP",
    },
    {
        "category": "ho_tich",
        "question": "Giấy khai sinh bị mất có cấp lại không và cần thủ tục gì?",
        "answer": "Có, được cấp bản sao trích lục hộ tịch thay thế giấy khai sinh bản chính. Hồ sơ gồm: (1) Tờ khai đề nghị cấp bản sao trích lục hộ tịch; (2) CCCD/hộ chiếu của người yêu cầu. Nộp tại UBND cấp xã nơi đã đăng ký khai sinh. Lệ phí: 8.000 đồng/bản. Thời hạn giải quyết: ngay trong ngày hoặc trả kết quả ngày làm việc tiếp theo.",
        "can_cu": "Luật Hộ tịch 2014 Điều 63, 64; Thông tư 04/2020/TT-BTP",
    },
    {
        "category": "ho_tich",
        "question": "Trẻ em sinh ra ở nước ngoài khi về Việt Nam có cần đăng ký khai sinh không?",
        "answer": "Có, phải đăng ký khai sinh tại Việt Nam. Nếu đã đăng ký ở nước ngoài, cần làm thủ tục ghi vào sổ hộ tịch tại UBND cấp xã nơi cha/mẹ cư trú. Hồ sơ gồm: giấy khai sinh do nước ngoài cấp (đã hợp pháp hóa lãnh sự và dịch sang tiếng Việt), CCCD cha/mẹ.",
        "can_cu": "Luật Hộ tịch 2014 Điều 30; Nghị định 123/2015/NĐ-CP Điều 23",
    },
    {
        "category": "ho_tich",
        "question": "Thủ tục khai sinh lưu động áp dụng cho trường hợp nào?",
        "answer": "Đăng ký khai sinh lưu động áp dụng cho các trường hợp cha, mẹ hoặc người thân thích không thể đến UBND cấp xã do già yếu, bệnh tật, tàn tật hoặc điều kiện đi lại khó khăn. UBND cấp xã cử cán bộ tư pháp-hộ tịch đến tận nơi để tiếp nhận hồ sơ và thực hiện đăng ký.",
        "can_cu": "Luật Hộ tịch 2014 Điều 9; Nghị định 123/2015/NĐ-CP Điều 4",
    },
    {
        "category": "ho_tich",
        "question": "Nuôi con nuôi trong nước cần điều kiện gì?",
        "answer": "Người nhận nuôi cần: hơn con nuôi ít nhất 20 tuổi, có tư cách đạo đức tốt, có điều kiện kinh tế và chỗ ở ổn định, có sức khỏe tốt. Trẻ được nhận nuôi phải dưới 16 tuổi (trừ trường hợp anh/chị/em ruột). Thủ tục nộp tại UBND cấp xã nơi trẻ cư trú hoặc nơi người nhận nuôi cư trú.",
        "can_cu": "Luật Nuôi con nuôi 2010 Điều 14; Nghị định 19/2011/NĐ-CP",
    },
    {
        "category": "ho_tich",
        "question": "Xác nhận tình trạng hôn nhân (độc thân) cần làm gì?",
        "answer": "Nộp tại UBND cấp xã nơi thường trú. Hồ sơ gồm: (1) Tờ khai đề nghị xác nhận tình trạng hôn nhân; (2) CCCD hoặc hộ chiếu. Thời hạn giải quyết: không quá 3 ngày làm việc. Nếu phải xác minh: không quá 5 ngày. Không mất lệ phí.",
        "can_cu": "Nghị định 123/2015/NĐ-CP Điều 22; Thông tư 04/2020/TT-BTP",
    },
    # ── CƯ TRÚ (11-18) ────────────────────────────────────────────────────────
    {
        "category": "cu_tru",
        "question": "Sổ hộ khẩu giấy còn dùng được không sau khi bãi bỏ?",
        "answer": "Sổ hộ khẩu giấy đã hết hiệu lực từ ngày 01/01/2023 theo Luật Cư trú 2020. Thay vào đó, thông tin cư trú được quản lý trên Cơ sở dữ liệu về cư trú. Người dân có thể tra cứu thông tin cư trú qua app VNeID hoặc đề nghị cấp thông báo số định danh cá nhân và thông tin trong Cơ sở dữ liệu quốc gia về dân cư.",
        "can_cu": "Luật Cư trú 2020 Điều 38; Nghị định 62/2021/NĐ-CP",
    },
    {
        "category": "cu_tru",
        "question": "Đăng ký thường trú mới cần những giấy tờ gì?",
        "answer": "Hồ sơ gồm: (1) Phiếu báo thay đổi hộ khẩu, nhân khẩu; (2) CCCD/Căn cước; (3) Giấy tờ chứng minh chỗ ở hợp pháp (sổ đỏ/hợp đồng thuê nhà đã công chứng/xác nhận của chủ nhà). Nộp tại UBND cấp xã hoặc Công an cấp xã nơi muốn đăng ký. Thời hạn giải quyết: 7 ngày làm việc.",
        "can_cu": "Luật Cư trú 2020 Điều 24, 25; Nghị định 62/2021/NĐ-CP",
    },
    {
        "category": "cu_tru",
        "question": "Tách hộ khẩu cần điều kiện gì?",
        "answer": "Tách hộ khẩu (lập hộ mới) cần: (1) Có chỗ ở hợp pháp để lập hộ mới; (2) Được chủ hộ đồng ý (nếu tách ra từ hộ đang ở); (3) Không bắt buộc phải đủ 18 tuổi. Hồ sơ: phiếu báo thay đổi hộ khẩu + giấy tờ chứng minh chỗ ở. Nộp tại Công an cấp xã. Lưu ý: sau 2023 không còn sổ hộ khẩu giấy, thông tin quản lý điện tử.",
        "can_cu": "Luật Cư trú 2020 Điều 25; Nghị định 62/2021/NĐ-CP Điều 11",
    },
    {
        "category": "cu_tru",
        "question": "Người thuê nhà trọ có được đăng ký thường trú không?",
        "answer": "Có, người thuê nhà trọ được đăng ký thường trú nếu có hợp đồng thuê nhà hợp lệ và được chủ nhà đồng ý. Hợp đồng thuê phải được công chứng/chứng thực hoặc chủ nhà trực tiếp xác nhận. Trường hợp chủ nhà không đồng ý, người thuê chỉ được đăng ký tạm trú.",
        "can_cu": "Luật Cư trú 2020 Điều 20 khoản 3; Nghị định 62/2021/NĐ-CP",
    },
    {
        "category": "cu_tru",
        "question": "Đăng ký tạm trú dài hạn (từ 30 ngày trở lên) cần những gì?",
        "answer": "Hồ sơ gồm: (1) Tờ khai đăng ký tạm trú; (2) CCCD/Căn cước; (3) Giấy tờ chứng minh chỗ ở (hợp đồng thuê/ký túc xá/xác nhận chủ nhà). Nộp tại Công an cấp xã nơi tạm trú. Thời hạn giải quyết: 3 ngày làm việc. Đăng ký tạm trú có giá trị 2 năm, có thể gia hạn.",
        "can_cu": "Luật Cư trú 2020 Điều 27, 29; Nghị định 62/2021/NĐ-CP",
    },
    {
        "category": "cu_tru",
        "question": "Trẻ em dưới 14 tuổi có phải đăng ký thường trú riêng không?",
        "answer": "Không cần đăng ký riêng. Trẻ em dưới 14 tuổi đăng ký cùng cha hoặc mẹ trong cùng hộ. Nếu cha mẹ ở hộ khác nhau, trẻ đăng ký theo hộ của cha hoặc mẹ theo thỏa thuận của cha mẹ. Trẻ từ 14 tuổi có thể đăng ký thường trú riêng theo nguyện vọng.",
        "can_cu": "Luật Cư trú 2020 Điều 19; Nghị định 62/2021/NĐ-CP Điều 9",
    },
    {
        "category": "cu_tru",
        "question": "Sau khi kết hôn cần cập nhật thông tin cư trú thế nào?",
        "answer": "Sau khi kết hôn, nếu một bên chuyển đến ở cùng bên kia, cần làm thủ tục đăng ký thường trú tại nơi ở mới (nếu chuyển sang nơi khác) hoặc bổ sung vào hộ (nếu cùng địa chỉ). Thủ tục: nộp phiếu báo thay đổi hộ khẩu + CCCD + Giấy chứng nhận kết hôn tại Công an cấp xã.",
        "can_cu": "Luật Cư trú 2020 Điều 25; Nghị định 62/2021/NĐ-CP",
    },
    {
        "category": "cu_tru",
        "question": "Người từ tỉnh khác chuyển về TP.HCM đăng ký thường trú cần điều kiện gì?",
        "answer": "Cần có: (1) Chỗ ở hợp pháp (sở hữu nhà hoặc thuê nhà có hợp đồng và đồng ý của chủ nhà); (2) Đã đăng ký tạm trú tại TP.HCM từ 1 năm trở lên (đối với khu vực nội thành) hoặc không cần điều kiện tạm trú (đối với ngoại thành). Thủ tục nộp tại Công an quận/huyện hoặc phường/xã.",
        "can_cu": "Luật Cư trú 2020 Điều 20 khoản 4; Nghị định 62/2021/NĐ-CP",
    },
    # ── CHỨNG THỰC (19-25) ────────────────────────────────────────────────────
    {
        "category": "chung_thuc",
        "question": "Lệ phí chứng thực bản sao từ bản chính là bao nhiêu?",
        "answer": "Lệ phí chứng thực bản sao từ bản chính là 2.000 đồng/trang, từ trang thứ 3 trở lên là 1.000 đồng/trang, tối đa 200.000 đồng/bản. Người thuộc hộ nghèo, người cao tuổi, người khuyết tật được miễn lệ phí. Nộp tại UBND cấp xã hoặc Phòng Tư pháp cấp huyện.",
        "can_cu": "Thông tư 226/2016/TT-BTC; Nghị định 23/2015/NĐ-CP Điều 14",
    },
    {
        "category": "chung_thuc",
        "question": "Chứng thực chữ ký cần những gì và lệ phí bao nhiêu?",
        "answer": "Người yêu cầu chứng thực chữ ký phải trực tiếp ký trước mặt người có thẩm quyền. Hồ sơ: (1) CCCD/hộ chiếu của người ký; (2) Giấy tờ cần chứng thực chữ ký. Lệ phí: 10.000 đồng/trường hợp. Thực hiện tại UBND cấp xã (đối với chữ ký cá nhân) hoặc Phòng Tư pháp.",
        "can_cu": "Nghị định 23/2015/NĐ-CP Điều 24; Thông tư 226/2016/TT-BTC",
    },
    {
        "category": "chung_thuc",
        "question": "UBND phường có được chứng thực hợp đồng giao dịch không?",
        "answer": "Có, UBND cấp xã được chứng thực hợp đồng, giao dịch liên quan đến bất động sản tại địa phương và các hợp đồng, giao dịch khác theo quy định. Tuy nhiên, một số loại hợp đồng phức tạp (như hợp đồng có yếu tố nước ngoài) phải công chứng tại Phòng công chứng. Lệ phí: 50.000 đồng/hợp đồng, giao dịch.",
        "can_cu": "Nghị định 23/2015/NĐ-CP Điều 5; Luật Công chứng 2014",
    },
    {
        "category": "chung_thuc",
        "question": "Bản sao công chứng và bản sao chứng thực khác nhau như thế nào?",
        "answer": "Bản sao có chứng thực (do UBND cấp xã hoặc Phòng Tư pháp cấp): xác nhận nội dung bản sao giống bản chính, do công chức tư pháp ký. Công chứng (do tổ chức hành nghề công chứng): công chứng viên xác nhận tính xác thực và hợp pháp. Về giá trị pháp lý: bản sao có chứng thực được dùng thay bản chính trong các thủ tục hành chính; công chứng có giá trị pháp lý cao hơn trong giao dịch dân sự.",
        "can_cu": "Nghị định 23/2015/NĐ-CP Điều 2; Luật Công chứng 2014 Điều 3",
    },
    {
        "category": "chung_thuc",
        "question": "Thời hạn giải quyết chứng thực bản sao là bao lâu?",
        "answer": "Theo quy định, cơ quan có thẩm quyền phải chứng thực bản sao ngay trong ngày tiếp nhận hồ sơ. Trường hợp tiếp nhận sau 15 giờ mà không thể thực hiện ngay thì giải quyết trong ngày làm việc tiếp theo. Không được để quá 2 ngày làm việc kể từ ngày tiếp nhận.",
        "can_cu": "Nghị định 23/2015/NĐ-CP Điều 21; Luật ban hành VBQPPL 2015",
    },
    {
        "category": "chung_thuc",
        "question": "Có thể chứng thực bản sao từ file điện tử không?",
        "answer": "Hiện tại chưa có quy định chứng thực bản sao từ file điện tử tại cấp xã. Bản sao chứng thực phải được thực hiện từ bản chính giấy tờ. Tuy nhiên, có thể sử dụng bản sao điện tử có chữ ký số theo quy định riêng của các cơ quan nhà nước trong giao dịch điện tử.",
        "can_cu": "Nghị định 23/2015/NĐ-CP; Luật Giao dịch điện tử 2023",
    },
    # ── ĐẤT ĐAI (26-30) ───────────────────────────────────────────────────────
    {
        "category": "dat_dai",
        "question": "Sổ đỏ và sổ hồng khác nhau như thế nào?",
        "answer": "Sổ đỏ (Giấy chứng nhận quyền sử dụng đất theo Luật Đất đai 1993, 2003) chứng nhận quyền sử dụng đất. Sổ hồng (Giấy chứng nhận quyền sở hữu nhà ở theo Luật Nhà ở 2005) chứng nhận quyền sở hữu nhà. Từ năm 2009, được hợp nhất thành Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở và tài sản gắn liền với đất (bìa hồng). Tất cả đều có giá trị pháp lý như nhau.",
        "can_cu": "Luật Đất đai 2013 Điều 97; Nghị định 43/2014/NĐ-CP",
    },
    {
        "category": "dat_dai",
        "question": "Thủ tục sang tên sổ đỏ khi mua bán nhà đất cần những giấy tờ gì?",
        "answer": "Hồ sơ gồm: (1) Đơn đề nghị đăng ký biến động; (2) Hợp đồng mua bán nhà đất đã công chứng; (3) Sổ đỏ/sổ hồng bản gốc; (4) CCCD của người mua và người bán; (5) Tờ khai lệ phí trước bạ. Nộp tại Văn phòng đăng ký đất đai quận/huyện. Thời hạn: 10-15 ngày làm việc.",
        "can_cu": "Luật Đất đai 2013 Điều 95; Nghị định 43/2014/NĐ-CP Điều 8, 9",
    },
    {
        "category": "dat_dai",
        "question": "Đất không có sổ đỏ có bán được không?",
        "answer": "Đất chưa có Giấy chứng nhận quyền sử dụng đất (sổ đỏ) vẫn có thể sang tên nhưng phức tạp hơn. Người mua chịu rủi ro vì không được pháp luật bảo hộ đầy đủ. Việc chuyển nhượng chỉ có giá trị khi người bán đủ điều kiện được cấp sổ và tiến hành đăng ký. Không nên mua bán đất chưa có sổ để tránh tranh chấp.",
        "can_cu": "Luật Đất đai 2013 Điều 188; Nghị định 43/2014/NĐ-CP",
    },
    {
        "category": "dat_dai",
        "question": "Thủ tục tách thửa đất cần điều kiện gì?",
        "answer": "Điều kiện tách thửa: (1) Có Giấy chứng nhận quyền sử dụng đất; (2) Diện tích mỗi thửa sau tách không nhỏ hơn diện tích tối thiểu được tách thửa theo quy định của UBND tỉnh/thành phố; (3) Thửa đất không có tranh chấp. Hồ sơ nộp tại Văn phòng đăng ký đất đai quận/huyện. Thời hạn: 15-25 ngày làm việc.",
        "can_cu": "Luật Đất đai 2013 Điều 143; Nghị định 43/2014/NĐ-CP Điều 29",
    },
    {
        "category": "dat_dai",
        "question": "Đất bị thu hồi thì người dân được bồi thường như thế nào?",
        "answer": "Người dân được bồi thường về đất theo giá đất cụ thể do UBND tỉnh quyết định tại thời điểm thu hồi. Ngoài ra còn được hỗ trợ di chuyển, ổn định đời sống, đào tạo chuyển đổi nghề và bố trí tái định cư. Người dân có quyền khiếu nại nếu không đồng ý với phương án bồi thường.",
        "can_cu": "Luật Đất đai 2013 Điều 74, 83, 86; Nghị định 47/2014/NĐ-CP",
    },
    # ── KINH DOANH (31-35) ────────────────────────────────────────────────────
    {
        "category": "kinh_doanh",
        "question": "Hộ kinh doanh có cần con dấu không?",
        "answer": "Hộ kinh doanh không bắt buộc phải có con dấu. Theo Luật Doanh nghiệp 2020 và Nghị định 01/2021/NĐ-CP, hộ kinh doanh tự quyết định về việc có hay không có con dấu. Nếu muốn khắc dấu, thực hiện theo quy định về quản lý con dấu.",
        "can_cu": "Nghị định 01/2021/NĐ-CP Điều 80; Luật Doanh nghiệp 2020 Điều 44",
    },
    {
        "category": "kinh_doanh",
        "question": "Đăng ký hộ kinh doanh cần những gì và lệ phí bao nhiêu?",
        "answer": "Hồ sơ gồm: (1) Giấy đề nghị đăng ký hộ kinh doanh; (2) CCCD/Căn cước của chủ hộ; (3) Bản sao hợp lệ giấy tờ pháp lý về địa điểm kinh doanh. Nộp tại Phòng Tài chính - Kế hoạch quận/huyện hoặc UBND cấp xã (theo phân cấp). Lệ phí: 100.000 đồng. Thời hạn giải quyết: 3 ngày làm việc.",
        "can_cu": "Nghị định 01/2021/NĐ-CP Điều 75, 76; Luật Doanh nghiệp 2020",
    },
    {
        "category": "kinh_doanh",
        "question": "Hộ kinh doanh có phải nộp thuế không?",
        "answer": "Có. Hộ kinh doanh phải nộp: (1) Thuế GTGT và thuế TNCN theo phương pháp khoán (thuế khoán) do cơ quan thuế ấn định; (2) Lệ phí môn bài hàng năm (tùy doanh thu). Từ 2021, hộ kinh doanh có doanh thu dưới 100 triệu đồng/năm được miễn thuế GTGT và TNCN.",
        "can_cu": "Nghị định 126/2020/NĐ-CP; Thông tư 40/2021/TT-BTC",
    },
    {
        "category": "kinh_doanh",
        "question": "Tạm ngừng hoạt động hộ kinh doanh cần thủ tục gì?",
        "answer": "Thủ tục: (1) Nộp thông báo tạm ngừng kinh doanh tại cơ quan đăng ký kinh doanh (Phòng Tài chính-Kế hoạch) trước ít nhất 3 ngày làm việc; (2) Thời hạn tạm ngừng tối đa 1 năm; có thể gia hạn nhưng không được quá 2 năm liên tiếp. Trong thời gian tạm ngừng, không phải nộp thuế.",
        "can_cu": "Nghị định 01/2021/NĐ-CP Điều 86; Luật Doanh nghiệp 2020 Điều 206",
    },
    {
        "category": "kinh_doanh",
        "question": "Hộ kinh doanh có được xuất hóa đơn không?",
        "answer": "Có, hộ kinh doanh được sử dụng hóa đơn. Có thể đăng ký sử dụng hóa đơn điện tử tại cơ quan thuế hoặc mua hóa đơn từ cơ quan thuế. Hộ kinh doanh nộp thuế khoán sử dụng hóa đơn khi bán hàng theo yêu cầu của khách. Từ 01/7/2022, bắt buộc sử dụng hóa đơn điện tử.",
        "can_cu": "Nghị định 123/2020/NĐ-CP; Thông tư 78/2021/TT-BTC",
    },
    # ── XÃ HỘI (36-40) ────────────────────────────────────────────────────────
    {
        "category": "xa_hoi",
        "question": "Hộ nghèo được hưởng những chính sách ưu đãi gì?",
        "answer": "Hộ nghèo được hưởng: (1) Cấp thẻ BHYT miễn phí; (2) Miễn học phí cho con em; (3) Hỗ trợ tiền điện hàng tháng (50.000 đồng/tháng); (4) Vay vốn ưu đãi từ Ngân hàng Chính sách xã hội; (5) Hỗ trợ nhà ở; (6) Miễn giảm các lệ phí hành chính; (7) Các hỗ trợ khác theo chương trình mục tiêu quốc gia giảm nghèo.",
        "can_cu": "Nghị định 07/2021/NĐ-CP; Quyết định 90/QĐ-TTg ngày 18/01/2022",
    },
    {
        "category": "xa_hoi",
        "question": "Thủ tục xác nhận hộ nghèo cần những gì?",
        "answer": "Hàng năm (thường vào tháng 10-12), UBND xã/phường tổ chức rà soát và lập danh sách hộ nghèo theo tiêu chí đa chiều. Người dân không cần nộp hồ sơ riêng — cán bộ xã sẽ đến khảo sát. Nếu hộ mới chuyển đến hoặc có thay đổi, nộp đơn đề nghị xét duyệt tại UBND xã. Kết quả được công bố sau khi UBND huyện phê duyệt.",
        "can_cu": "Nghị định 07/2021/NĐ-CP Điều 17; Thông tư 02/2021/TT-BLĐTBXH",
    },
    {
        "category": "xa_hoi",
        "question": "Người cao tuổi từ 80 tuổi được hưởng trợ cấp bao nhiêu?",
        "answer": "Người cao tuổi từ đủ 80 tuổi trở lên không có lương hưu hoặc trợ cấp BHXH được hưởng trợ cấp xã hội hàng tháng. Mức trợ cấp: bằng mức chuẩn trợ giúp xã hội (360.000 đồng/tháng theo Nghị định 20/2021). Người cao tuổi từ 80 tuổi thuộc hộ nghèo, sống độc thân hoặc ở vùng khó khăn được hưởng thêm các chế độ ưu đãi.",
        "can_cu": "Nghị định 20/2021/NĐ-CP Điều 5; Luật Người cao tuổi 2009",
    },
    {
        "category": "xa_hoi",
        "question": "Trẻ em dưới 6 tuổi có được hưởng bảo hiểm y tế miễn phí không?",
        "answer": "Có. Trẻ em dưới 6 tuổi được cấp thẻ bảo hiểm y tế miễn phí 100% do ngân sách nhà nước đóng. Cha/mẹ đến đăng ký khai sinh cho con tại UBND cấp xã đồng thời được hướng dẫn làm thủ tục cấp thẻ BHYT. Thẻ BHYT cho phép khám chữa bệnh tại cơ sở y tế theo tuyến.",
        "can_cu": "Luật BHYT 2008 sửa đổi 2014 Điều 12; Nghị định 146/2018/NĐ-CP",
    },
    {
        "category": "xa_hoi",
        "question": "Người khuyết tật cần thủ tục gì để được hỗ trợ xã hội?",
        "answer": "Thủ tục: (1) Nộp đơn đề nghị tại UBND xã/phường; (2) Hội đồng xác định mức độ khuyết tật cấp xã thực hiện giám định; (3) Nhận Giấy xác nhận khuyết tật và thẻ BHYT miễn phí. Hồ sơ gồm: đơn đề nghị, ảnh 3x4, CCCD. Người khuyết tật nặng và đặc biệt nặng được hưởng trợ cấp xã hội hàng tháng.",
        "can_cu": "Luật Người khuyết tật 2010 Điều 17, 18; Nghị định 28/2012/NĐ-CP",
    },
    # ── THỰC TẾ (41-50) ───────────────────────────────────────────────────────
    {
        "category": "thuc_te",
        "question": "Người dân đến UBND phường nộp hồ sơ trong giờ nào?",
        "answer": "Giờ làm việc tại UBND cấp xã/phường: sáng từ 7h30 đến 11h30, chiều từ 13h00 đến 17h00, từ thứ Hai đến thứ Sáu. Một số UBND có tiếp nhận hồ sơ sáng thứ Bảy (thường đến 11h30). Người dân nên đến trước 15h chiều để được tiếp nhận và giải quyết trong ngày.",
        "can_cu": "Quyết định 1847/QĐ-TTg ngày 27/12/2018; Nghị quyết 76/NQ-CP 2021",
    },
    {
        "category": "thuc_te",
        "question": "Hồ sơ thiếu giấy tờ thì cán bộ tiếp nhận xử lý thế nào?",
        "answer": "Theo quy định, cán bộ tiếp nhận phải kiểm tra hồ sơ ngay khi tiếp nhận. Nếu hồ sơ thiếu hoặc không hợp lệ, cán bộ phải thông báo bằng văn bản ngay trong ngày, nêu rõ giấy tờ cần bổ sung. Không được yêu cầu bổ sung giấy tờ không có trong danh mục quy định. Người dân bổ sung và nộp lại mà không mất phí.",
        "can_cu": "Nghị định 61/2018/NĐ-CP Điều 17; Luật ban hành VBQPPL 2015",
    },
    {
        "category": "thuc_te",
        "question": "Người dân có thể ủy quyền cho người khác nộp hồ sơ thay không?",
        "answer": "Có, người dân có thể ủy quyền cho người khác nộp hồ sơ và nhận kết quả thay. Văn bản ủy quyền phải có chứng thực chữ ký của người ủy quyền. Trường hợp ủy quyền cho cha, mẹ, vợ, chồng, con, anh/chị/em ruột thì văn bản ủy quyền không cần chứng thực nhưng phải xuất trình giấy tờ chứng minh quan hệ.",
        "can_cu": "Bộ luật Dân sự 2015 Điều 138; Nghị định 23/2015/NĐ-CP",
    },
    {
        "category": "thuc_te",
        "question": "Thời hạn giải quyết thủ tục hành chính cấp xã tối đa là bao nhiêu ngày?",
        "answer": "Tùy từng loại thủ tục. Các thủ tục đơn giản: 1-3 ngày làm việc (chứng thực, xác nhận). Thủ tục hộ tịch: 1-5 ngày. Thủ tục phức tạp cần xác minh: 10-15 ngày. Theo Nghị quyết 76/2021/NQ-CP, phải niêm yết công khai thời hạn từng thủ tục. Nếu quá hạn mà chưa có kết quả, cán bộ phải thông báo lý do và hẹn ngày mới.",
        "can_cu": "Nghị định 61/2018/NĐ-CP Điều 18; Nghị quyết 76/NQ-CP 2021",
    },
    {
        "category": "thuc_te",
        "question": "Hồ sơ trực tuyến bị từ chối phải làm thế nào?",
        "answer": "Khi hồ sơ trực tuyến bị từ chối, hệ thống gửi thông báo lý do từ chối qua email/SMS. Người dân cần: (1) Đọc kỹ lý do từ chối; (2) Bổ sung/chỉnh sửa theo yêu cầu; (3) Nộp lại hồ sơ qua cổng dịch vụ công. Nếu không đồng ý với lý do từ chối, có thể liên hệ trực tiếp với bộ phận một cửa để được hướng dẫn.",
        "can_cu": "Nghị định 45/2020/NĐ-CP; Nghị định 107/2021/NĐ-CP",
    },
    {
        "category": "thuc_te",
        "question": "Bản photo (bản chụp) có được chấp nhận thay bản chính không?",
        "answer": "Theo quy định mới, đối với các giấy tờ có trong Cơ sở dữ liệu quốc gia thì cán bộ tự tra cứu, người dân không cần nộp. Với giấy tờ chưa có trong CSDL, người dân có thể nộp bản chụp kèm bản chính để đối chiếu — cán bộ ký xác nhận và trả lại bản chính. Không được yêu cầu nộp bản sao có chứng thực nếu người dân đã xuất trình bản chính.",
        "can_cu": "Nghị định 45/2020/NĐ-CP; Thông tư 01/2023/TT-VPCP",
    },
    {
        "category": "thuc_te",
        "question": "Trường hợp nào được miễn lệ phí khi làm thủ tục hành chính?",
        "answer": "Miễn lệ phí cho: (1) Hộ nghèo, hộ cận nghèo; (2) Người có công với cách mạng; (3) Người cao tuổi (từ 60 tuổi, tùy từng loại lệ phí); (4) Người khuyết tật; (5) Trẻ em; (6) Đồng bào dân tộc thiểu số ở vùng khó khăn; (7) Một số thủ tục cấp thiết (khai sinh, khai tử). Mức miễn cụ thể theo từng loại lệ phí và văn bản hướng dẫn.",
        "can_cu": "Luật Phí và lệ phí 2015 Điều 10; Các Thông tư hướng dẫn của BTC",
    },
    {
        "category": "thuc_te",
        "question": "Hồ sơ quá hạn giải quyết thì người dân khiếu nại ở đâu?",
        "answer": "Người dân có thể: (1) Khiếu nại trực tiếp đến Chủ tịch UBND cấp xã nơi tiếp nhận hồ sơ; (2) Khiếu nại lên Chủ tịch UBND cấp huyện nếu không được giải quyết; (3) Phản ánh qua đường dây nóng của UBND tỉnh/thành phố; (4) Gửi đơn đến Thanh tra nhà nước. Người dân có quyền yêu cầu bồi thường thiệt hại nếu cơ quan nhà nước giải quyết trễ.",
        "can_cu": "Luật Khiếu nại 2011 Điều 7; Nghị định 31/2019/NĐ-CP",
    },
    {
        "category": "thuc_te",
        "question": "CCCD gắn chip có thể thay thế những giấy tờ nào trong thủ tục hành chính?",
        "answer": "CCCD gắn chip chứa thông tin cá nhân, vân tay, chip điện tử — có thể thay thế nhiều giấy tờ: (1) Xác nhận nhân thân thay sổ hộ khẩu; (2) Chứng minh đủ tuổi thay giấy khai sinh; (3) Tra cứu thông tin cư trú thay giấy xác nhận thường trú. Qua app VNeID, còn có thể tra cứu bảo hiểm y tế, bằng lái xe, đăng ký xe. Mục tiêu đến 2025 thay thế hoàn toàn nhiều giấy tờ hành chính.",
        "can_cu": "Luật Căn cước 2023; Quyết định 06/QĐ-TTg 2022 về Đề án 06",
    },
    {
        "category": "thuc_te",
        "question": "Người dân bị mất CCCD cần làm gì để vẫn thực hiện được thủ tục hành chính?",
        "answer": "Khi mất CCCD: (1) Báo ngay cho Công an cấp xã để được xác nhận mất giấy tờ; (2) Làm thủ tục cấp lại CCCD tại Công an cấp huyện (mang 2 ảnh 3x4, đóng lệ phí 70.000 đồng); (3) Trong thời gian chờ cấp lại, có thể dùng Xác nhận thông tin căn cước do Công an cấp hoặc sử dụng hộ chiếu còn hiệu lực thay thế. Thời gian cấp lại: 7-15 ngày.",
        "can_cu": "Luật Căn cước 2023 Điều 25; Nghị định 70/2022/NĐ-CP",
    },
]


async def main() -> None:
    from app.core.database import AsyncSessionLocal
    from app.services import embedding_service

    if not embedding_service.is_available():
        print("Loading embedding model...")
        await asyncio.to_thread(embedding_service._load_model)
        if not embedding_service.is_available():
            print("ERROR: model load failed"); return
        print("Model ready ✅")

    from sqlalchemy import text

    total = len(QA_DATA)
    inserted = failed = 0

    async with AsyncSessionLocal() as db:
        for i, qa in enumerate(QA_DATA, 1):
            try:
                q_emb = await asyncio.to_thread(embedding_service.embed_text, qa["question"])
                a_emb = await asyncio.to_thread(embedding_service.embed_text, qa["answer"])

                await db.execute(
                    text("""
                        INSERT INTO qa_pairs
                            (id, question, answer, can_cu, category,
                             question_embedding, answer_embedding,
                             visibility, created_by)
                        VALUES
                            (:id, :q, :a, :can_cu, :cat,
                             :qe, :ae, 'system', :uid)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "q": qa["question"],
                        "a": qa["answer"],
                        "can_cu": qa.get("can_cu", ""),
                        "cat": qa["category"],
                        "qe": str(q_emb),
                        "ae": str(a_emb),
                        "uid": ADMIN_USER_ID,
                    }
                )
                await db.commit()
                inserted += 1
                print(f"[{i:2d}/{total}] ✅ {qa['question'][:55]}")
            except Exception as exc:
                failed += 1
                print(f"[{i:2d}/{total}] ❌ {qa['question'][:55]} — {exc}")
                await db.rollback()

    print(f"\n=== DONE ===")
    print(f"  Inserted: {inserted}/{total}")
    print(f"  Failed:   {failed}")


if __name__ == "__main__":
    asyncio.run(main())
