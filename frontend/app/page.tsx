import Link from "next/link";
import {
  PenLine, ShieldCheck, Search, Users, BookOpen,
  BarChart3, ClipboardList, XCircle, CheckCircle2,
  Server, Brain, Wallet, ChevronDown, Scale, Sparkles,
} from "lucide-react";
import ChatWidget from "@/components/public/ChatWidget";
import { HeroPattern } from "@/components/landing/HeroPattern";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getOrgTheme(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/v1/organizations/public-theme`, {
      cache: "no-store",
    });
    if (!res.ok) return "teal";
    const data = await res.json();
    return data.theme ?? "teal";
  } catch {
    return "teal";
  }
}

const AGENTS = [
  { Icon: PenLine,       name: "Soạn thảo văn bản",       desc: "Tạo văn bản đúng thể thức theo Nghị định 30" },
  { Icon: ShieldCheck,   name: "Rà soát văn bản",          desc: "Phát hiện lỗi, đề xuất chỉnh sửa trực tiếp" },
  { Icon: Search,        name: "Tra cứu pháp lý",          desc: "Trả lời kèm căn cứ, trích dẫn nguồn tin cậy" },
  { Icon: Users,         name: "Trợ giúp công dân",        desc: "Giải đáp thủ tục 24/7 bằng ngôn ngữ dễ hiểu" },
  { Icon: BookOpen,      name: "Biểu mẫu thường sử dụng",  desc: "Hỗ trợ tìm nhanh biểu mẫu thường sử dụng" },
  { Icon: BarChart3,     name: "Tổng hợp & Báo cáo",       desc: "Tự động tổng hợp số liệu, lập báo cáo" },
  { Icon: ClipboardList, name: "Quản lý công việc",        desc: "Theo dõi tiến độ, nhắc hạn xử lý hồ sơ" },
];

const PROBLEMS = [
  "Tra cứu, đối chiếu văn bản gặp nhiều khó khăn",
  "Mất thời gian cho công việc thường xuyên lặp lại",
  "Dễ sai thể thức, lỗi nội dung khi soạn thảo thủ công",
  "Các AI khác không đảm bảo bảo mật",
];

const SOLUTIONS = [
  "Tra cứu, đối chiếu văn bản nhanh, có căn cứ kiểm chứng",
  "Tự động hóa soạn thảo văn bản và tài liệu hành chính",
  "Hỗ trợ soạn thảo đúng thể thức, hạn chế sai sót nội dung",
  "Đảm bảo tiêu chuẩn Quốc gia về An toàn thông tin",
];

const STATS = [
  { value: "272",   label: "Văn bản trong kho tri thức" },
  { value: "7.525", label: "Đoạn nội dung được index" },
  { value: "93%",   label: "Độ tin cậy tra cứu" },
  { value: "7",     label: "Trợ lý AI chuyên biệt" },
];

const SECURITY = [
  { Icon: Server, title: "Self-hosted",     desc: "Toàn bộ xử lý trong hạ tầng cơ quan, không gửi dữ liệu ra ngoài" },
  { Icon: Brain,  title: "Mô hình tự chủ", desc: "Tinh chỉnh riêng cho nghiệp vụ hành chính tiếng Việt" },
  { Icon: Wallet, title: "Chi phí tối ưu", desc: "Đầu tư một lần, không phí theo lượt gọi API" },
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

export default async function HomePage() {
  const theme = await getOrgTheme();
  const themeClass = theme === "blue" ? "theme-blue" : theme === "blue-red" ? "theme-blue-red" : "";

  return (
    <div className={themeClass || undefined}>
    <main className="flex min-h-screen flex-col">

      {/* ── A. HEADER ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10"
        style={{ background: "rgba(4,44,83,0.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #378ADD 0%, #7F77DD 100%)" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              Civic
              <span className="bg-gradient-to-r from-[#378ADD] to-[#AFA9EC] bg-clip-text text-transparent">
                AI
              </span>
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm px-5 py-2 rounded-full font-medium transition-colors border border-[#378ADD]/50 text-[#85B7EB] hover:bg-[#378ADD]/20"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* ── B. HERO + STATS (100vh) ── */}
      <section
        className="relative overflow-hidden flex flex-col min-h-screen pt-16"
        style={{ background: "#042C53" }}
      >
        {/* Glow 1 — top right */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            top: "-80px", right: "-80px",
            width: "300px", height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56,138,221,0.3) 0%, transparent 70%)",
          }}
        />
        {/* Glow 2 — bottom left */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            bottom: "80px", left: "60px",
            width: "350px", height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(127,119,221,0.2) 0%, transparent 70%)",
          }}
        />

        {/* HeroPattern */}
        <HeroPattern />

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="container mx-auto px-4 text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 mb-5"
              style={{
                color: "#85B7EB",
                background: "rgba(55,138,221,0.15)",
                border: "1px solid rgba(55,138,221,0.3)",
              }}
            >
              <span>✦</span>
              <span>Trợ lý AI hành chính công</span>
            </div>

            <h1 className="text-white font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight max-w-3xl mx-auto leading-tight">
              Nâng cao năng suất
              <br />
              hành chính cấp cơ sở
            </h1>

            <p
              className="text-base sm:text-lg max-w-2xl mx-auto mt-4 mb-8 leading-relaxed"
              style={{ color: "#85B7EB" }}
            >
              Hệ thống trợ lý AI chuyên biệt cho hành chính công, hỗ trợ cán bộ soạn thảo, tra cứu và giải đáp thủ tục hành chính.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/login" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto px-8 py-3 rounded-full font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, #378ADD 0%, #7F77DD 100%)" }}
                >
                  Dùng thử ngay
                </button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto px-8 py-3 rounded-full font-medium text-white transition-colors hover:bg-white/10 flex items-center justify-center gap-2"
                  style={{ border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <ChevronDown className="h-4 w-4" />
                  Xem tính năng
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Stats — pinned to bottom of 100vh section */}
        <div
          className="relative z-10 border-t border-white/10"
          style={{ background: "rgba(12,68,124,0.6)" }}
        >
          <div className="container py-5 px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-bold text-3xl sm:text-4xl text-white">{s.value}</p>
                  <p className="text-sm mt-1" style={{ color: "#85B7EB" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── D. VẤN ĐỀ & GIẢI PHÁP ── */}
      <section className="bg-white py-20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: "#378ADD" }}>
              Điểm nghẽn thực tiễn
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "#042C53" }}>
              Giải quyết điểm nghẽn thực tiễn
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              Được thiết kế dựa trên khảo sát 152 cán bộ tại 10 đơn vị cấp xã
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Thực trạng */}
            <div
              className="rounded-lg p-5"
              style={{ background: "#FEF2F2", borderLeft: "4px solid #E24B4A" }}
            >
              <p className="text-sm font-medium mb-4" style={{ color: "#A32D2D" }}>Thực trạng</p>
              <ul className="space-y-3">
                {PROBLEMS.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#E24B4A" }} />
                    <span className="text-base" style={{ color: "#042C53" }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Với CivicAI */}
            <div
              className="rounded-lg p-5"
              style={{ background: "#EFF6FF", borderLeft: "4px solid #378ADD" }}
            >
              <p className="text-sm font-medium mb-4" style={{ color: "#0C447C" }}>Với CivicAI</p>
              <ul className="space-y-3">
                {SOLUTIONS.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#378ADD" }} />
                    <span className="text-base" style={{ color: "#042C53" }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── D2. BẢO MẬT & TUÂN THỦ ── */}
      <section className="py-16" style={{ background: "#F8FAFC" }}>
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: "#378ADD" }}>
              Pháp lý & An toàn
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "#042C53" }}>
              Bảo mật &amp; Tuân thủ
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              Đáp ứng đầy đủ quy định pháp lý về an toàn thông tin cho hệ thống hành chính công
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {COMPLIANCE.map(({ Icon, title, subtitle }) => (
              <div
                key={title}
                className="rounded-lg p-5 bg-white"
                style={{ border: "1px solid #B5D4F4" }}
              >
                <Icon className="h-6 w-6 mb-3" style={{ color: "#378ADD" }} />
                <p className="font-semibold text-base mb-2" style={{ color: "#042C53" }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#185FA5" }}>{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── E. 7 TÍNH NĂNG ── */}
      <section id="features" className="relative overflow-hidden py-20" style={{ background: "#042C53" }}>
        {/* Glow trang trí */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            top: "-60px", right: "-60px",
            width: "280px", height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(127,119,221,0.25) 0%, transparent 70%)",
          }}
        />

        <div className="container relative z-10">
          <div className="text-center mb-12">
            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: "#85B7EB" }}>
              Các trợ lý AI
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              7 trợ lý AI chuyên biệt
            </h2>
            <p className="text-base mt-2" style={{ color: "#85B7EB" }}>
              Các trợ lý AI cộng tác với nhau, con người giữ quyền quyết định
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {AGENTS.map(({ Icon, name, desc }) => (
              <div
                key={name}
                className="rounded-lg p-4"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(55,138,221,0.2)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#85B7EB" }} />
                </div>
                <p className="font-medium text-base text-white">{name}</p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "#85B7EB" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── F. LƯU TRỮ & DỮ LIỆU ── */}
      <section className="py-16" style={{ background: "#0C447C" }}>
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: "#85B7EB" }}>
              Hạ tầng
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Lưu trữ và Dữ liệu
            </h2>
            <p className="text-base mt-2" style={{ color: "#85B7EB" }}>
              Toàn quyền kiểm soát dữ liệu trong hạ tầng của cơ quan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {SECURITY.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-lg p-5"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Icon className="h-7 w-7 mb-3" style={{ color: "#85B7EB" }} />
                <p className="font-medium text-base text-white mb-2">{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#B5D4F4" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── G. CTA ── */}
      <section
        className="relative overflow-hidden py-20"
        style={{ background: "#042C53" }}
      >
        {/* Center glow */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            style={{
              width: "500px", height: "300px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,138,221,0.25) 0%, transparent 60%)",
            }}
          />
        </div>

        <div className="container relative z-10 flex flex-col items-center text-center gap-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Bắt đầu trải nghiệm ngay hôm nay
          </h2>
          <p className="text-base max-w-xl" style={{ color: "#85B7EB" }}>
            Đăng ký miễn phí và trải nghiệm ngay sức mạnh của trợ lý AI hành chính.
          </p>
          <Link href="/login">
            <button
              className="px-10 py-4 rounded-full font-medium text-lg text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(90deg, #378ADD 0%, #7F77DD 100%)" }}
            >
              Bắt đầu trải nghiệm ngay
            </button>
          </Link>
        </div>
      </section>

      {/* ── H. FOOTER ── */}
      <footer
        className="border-t py-8"
        style={{ background: "#021D38", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <p className="text-center text-sm" style={{ color: "#85B7EB" }}>
          © 2026 CivicAI · Sở KHCN TP. HCM
        </p>
      </footer>

      <ChatWidget />
    </main>
    </div>
  );
}
