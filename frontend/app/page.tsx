import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Building2, PenLine, ShieldCheck, Search, Users, BookOpen,
  BarChart3, ClipboardList, XCircle, CheckCircle2,
  Server, Brain, Wallet, ChevronDown, Scale,
} from "lucide-react";
import ChatWidget from "@/components/public/ChatWidget";

const AGENTS = [
  {
    Icon: PenLine,
    name: "Soạn thảo văn bản",
    desc: "Tạo văn bản đúng thể thức theo Nghị định 30",
  },
  {
    Icon: ShieldCheck,
    name: "Rà soát văn bản",
    desc: "Phát hiện lỗi, đề xuất chỉnh sửa trực tiếp",
  },
  {
    Icon: Search,
    name: "Tra cứu pháp lý",
    desc: "Trả lời kèm căn cứ, trích dẫn nguồn tin cậy",
  },
  {
    Icon: Users,
    name: "Trợ giúp công dân",
    desc: "Giải đáp thủ tục 24/7 bằng ngôn ngữ dễ hiểu",
  },
  {
    Icon: BookOpen,
    name: "Biểu mẫu thường sử dụng",
    desc: "Hỗ trợ tìm nhanh biểu mẫu thường sử dụng",
  },
  {
    Icon: BarChart3,
    name: "Tổng hợp & Báo cáo",
    desc: "Tự động tổng hợp số liệu, lập báo cáo",
  },
  {
    Icon: ClipboardList,
    name: "Quản lý công việc",
    desc: "Theo dõi tiến độ, nhắc hạn xử lý hồ sơ",
  },
];

const PROBLEMS = [
  "Tra cứu, đối chiếu văn bản gặp nhiều khó khăn",
  "Mất thời gian cho công việc thường xuyên lặp lại",
  "Dễ sai thể thức, lỗi nội dung khi soạn thảo thủ công",
  "Các AI khác không đảm bảo bảo mật",
];

const SOLUTIONS = [
  "Tra cứu, đối chiếu văn bản nhanh, có căn cứ kiểm chứng",
  "Tự động hóa soạn thảo văn bản, tài liệu và nội dung hành chính thường dùng",
  "Hỗ trợ soạn thảo đúng thể thức, hạn chế sai sót nội dung",
  "Đảm bảo tiêu chuẩn Quốc gia về An toàn thông tin",
];

const STATS = [
  { value: "272", label: "Văn bản trong kho tri thức" },
  { value: "7.525", label: "Đoạn nội dung được index" },
  { value: "93%", label: "Độ tin cậy tra cứu" },
  { value: "7", label: "Trợ lý AI chuyên biệt" },
];

const SECURITY = [
  {
    Icon: Server,
    title: "Self-hosted",
    desc: "Toàn bộ xử lý trong hạ tầng cơ quan, không gửi dữ liệu ra ngoài",
  },
  {
    Icon: Brain,
    title: "Mô hình tự chủ",
    desc: "Tinh chỉnh riêng cho nghiệp vụ hành chính tiếng Việt",
  },
  {
    Icon: Wallet,
    title: "Chi phí tối ưu",
    desc: "Đầu tư một lần, không phí theo lượt gọi API",
  },
];

const COMPLIANCE = [
  {
    Icon: Scale,
    title: "Luật Trí tuệ nhân tạo số 134/2025/QH15",
    subtitle: "Quy định về phát triển, quản lý và sử dụng trí tuệ nhân tạo an toàn, có trách nhiệm.",
  },
  {
    Icon: ShieldCheck,
    title: "Thông tư số 47/2026/TT-BCA",
    subtitle: "Quy chuẩn kỹ thuật quốc gia về an ninh mạng cho hệ thống lưu trữ tài liệu điện tử.",
  },
  {
    Icon: Server,
    title: "TCVN 14423:2025",
    subtitle: "Yêu cầu an ninh mạng đối với hệ thống thông tin quan trọng.",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* A. HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Building2 className="h-6 w-6 text-teal-600" />
            <span>CivicAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">Bắt đầu</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* B. HERO */}
      <section className="bg-gradient-to-br from-slate-900 to-teal-900 py-28">
        <div className="container flex flex-col items-center text-center gap-6">
          <span className="bg-teal-500/20 text-teal-300 rounded-full px-3 py-1 text-base">
            Hệ thống AI hỗ trợ hành chính • Triển khai nội bộ
          </span>
          <h1 className="text-white font-bold text-6xl tracking-tight max-w-3xl leading-tight">
            Nâng cao năng suất
            <br />
            hành chính cấp cơ sở
          </h1>
          <p className="text-slate-300 max-w-xl text-xl leading-relaxed">
            Hệ thống trợ lý AI với mô hình ngôn ngữ chuyên biệt cho hành chính công —
            hỗ trợ cán bộ soạn thảo, tra cứu và giải đáp thủ tục hành chính.
          </p>
          <div className="flex gap-4 mt-2">
            <Link href="/register">
              <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white">
                Dùng thử ngay
              </Button>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors text-base font-medium"
            >
              <ChevronDown className="h-4 w-4" />
              Xem tính năng
            </a>
          </div>
        </div>
      </section>

      {/* C. STATS */}
      <section className="bg-slate-800 py-12">
        <div className="container grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-bold text-5xl text-teal-400">{s.value}</p>
              <p className="text-base text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* D. VẤN ĐỀ & GIẢI PHÁP */}
      <section className="bg-white py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold">Giải quyết điểm nghẽn thực tiễn</h2>
            <p className="text-muted-foreground mt-2 text-base">
              Được thiết kế dựa trên khảo sát 152 cán bộ tại 10 đơn vị cấp xã
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold text-red-600 mb-4 text-xl">Thực trạng</h3>
              <ul className="space-y-3">
                {PROBLEMS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-base text-gray-700">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-teal-600 mb-4 text-xl">Với CivicAI</h3>
              <ul className="space-y-3">
                {SOLUTIONS.map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-base text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* D2. BẢO MẬT & TUÂN THỦ */}
      <section className="bg-slate-50 py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Bảo mật & Tuân thủ</h2>
            <p className="text-muted-foreground mt-2 text-base">
              Đáp ứng đầy đủ quy định pháp lý về an toàn thông tin cho hệ thống hành chính công
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto items-stretch">
            {COMPLIANCE.map(({ Icon, title, subtitle }) => (
              <div
                key={title}
                className="flex flex-col gap-3 bg-white border border-teal-100 rounded-xl p-5 shadow-sm min-h-[128px]"
              >
                <Icon className="h-6 w-6 text-teal-600 shrink-0" />
                <p className="font-semibold text-base text-slate-800 leading-snug">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* E. 7 TÍNH NĂNG */}
      <section id="features" className="bg-white py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold">7 trợ lý AI chuyên biệt</h2>
            <p className="text-muted-foreground mt-2 text-base">
              Các trợ lý AI cộng tác với nhau, con người giữ quyền quyết định
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENTS.map(({ Icon, name, desc }) => (
              <div
                key={name}
                className="rounded-xl border bg-white shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="rounded-lg bg-teal-50 p-2.5 w-fit">
                  <Icon className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">{name}</p>
                  <p className="text-base text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* F. LƯU TRỮ & DỮ LIỆU */}
      <section className="bg-teal-950 py-20">
        <div className="container">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Lưu trữ và Dữ liệu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {SECURITY.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white/10 rounded-xl p-6 text-white">
                <Icon className="h-7 w-7 text-teal-400 mb-3" />
                <p className="font-semibold text-lg mb-2">{title}</p>
                <p className="text-base text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* G. CTA */}
      <section className="bg-slate-900 py-20 text-center">
        <div className="container flex flex-col items-center">
          <Link href="/login">
            <Button
              size="lg"
              className="bg-teal-500 hover:bg-teal-400 text-white text-xl px-12 py-7 h-auto"
            >
              Bắt đầu trải nghiệm ngay
            </Button>
          </Link>
        </div>
      </section>

      {/* H. FOOTER */}
      <footer className="border-t py-8">
        <p className="text-center text-base text-slate-500">
          © 2025 CivicAI · Trường Đại học Sư phạm TP.HCM · Sở KH&CN TP.HCM
        </p>
      </footer>

      <ChatWidget />
    </main>
  );
}
