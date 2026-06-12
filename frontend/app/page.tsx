import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Building2, PenLine, ShieldCheck, Search, Users, BookOpen,
  BarChart3, ClipboardList, XCircle, CheckCircle2,
  Server, Brain, Wallet, ChevronDown,
} from "lucide-react";
import ChatWidget from "@/components/public/ChatWidget";

const AGENTS = [
  {
    Icon: PenLine,
    name: "Soạn thảo",
    desc: "Tạo văn bản đúng thể thức NĐ30 từ yêu cầu",
    badge: "Cốt lõi",
    badgeCls: "bg-teal-50 text-teal-700",
  },
  {
    Icon: ShieldCheck,
    name: "Rà soát",
    desc: "Phát hiện lỗi, đề xuất sửa dạng track changes",
    badge: "Cốt lõi",
    badgeCls: "bg-teal-50 text-teal-700",
  },
  {
    Icon: Search,
    name: "Tra cứu",
    desc: "Trả lời pháp lý kèm trích dẫn, chỉ số tin cậy",
    badge: "Cốt lõi",
    badgeCls: "bg-teal-50 text-teal-700",
  },
  {
    Icon: Users,
    name: "Trợ giúp công dân",
    desc: "Giải đáp thủ tục 24/7, ngôn ngữ đơn giản",
    badge: "Cốt lõi",
    badgeCls: "bg-teal-50 text-teal-700",
  },
  {
    Icon: BookOpen,
    name: "Hộ tịch & Chứng thực",
    desc: "Hỗ trợ tra cứu hồ sơ, biểu mẫu hộ tịch",
    badge: "Mở rộng",
    badgeCls: "bg-slate-100 text-slate-600",
  },
  {
    Icon: BarChart3,
    name: "Tổng hợp & Báo cáo",
    desc: "Tự động tổng hợp số liệu, lập báo cáo",
    badge: "Mở rộng",
    badgeCls: "bg-slate-100 text-slate-600",
  },
  {
    Icon: ClipboardList,
    name: "Quản lý công việc",
    desc: "Theo dõi tiến độ, nhắc hạn hồ sơ",
    badge: "Mở rộng",
    badgeCls: "bg-slate-100 text-slate-600",
  },
];

const PROBLEMS = [
  "Soạn thảo thủ công, dễ sai thể thức",
  "Tra cứu pháp lý phân tán, tốn thời gian",
  "Rà soát lỗi bằng mắt, bỏ sót nhiều",
  "Hướng dẫn công dân lặp đi lặp lại",
];

const SOLUTIONS = [
  "Soạn thảo AI đúng thể thức Nghị định 30",
  "Tra cứu ngôn ngữ tự nhiên, trích dẫn nguồn",
  "Rà soát tự động, đề xuất sửa từng lỗi",
  "Cổng công dân tự phục vụ 24/7",
];

const STATS = [
  { value: "272", label: "Văn bản trong kho tri thức" },
  { value: "7.525", label: "Đoạn nội dung được index" },
  { value: "93%", label: "Độ tin cậy tra cứu" },
  { value: "7", label: "Tác tử AI chuyên biệt" },
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
    desc: "Fine-tuned riêng cho nghiệp vụ hành chính tiếng Việt",
  },
  {
    Icon: Wallet,
    title: "Chi phí tối ưu",
    desc: "Đầu tư một lần, không phí theo lượt gọi API",
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
          <span className="bg-teal-500/20 text-teal-300 rounded-full px-3 py-1 text-sm">
            Hệ đa tác tử AI • Triển khai tự chủ
          </span>
          <h1 className="text-white font-bold text-5xl tracking-tight max-w-3xl leading-tight">
            Nâng cao năng suất
            <br />
            hành chính cấp cơ sở
          </h1>
          <p className="text-slate-300 max-w-2xl text-lg leading-relaxed">
            CivicAI ứng dụng kiến trúc đa tác tử AI và mô hình ngôn ngữ tinh chỉnh tự chủ,
            hỗ trợ cán bộ xã/phường soạn thảo, rà soát, tra cứu và giải đáp thủ tục hành chính.
          </p>
          <div className="flex gap-4 mt-2">
            <Link href="/register">
              <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white">
                Dùng thử ngay
              </Button>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors text-sm font-medium"
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
              <p className="font-bold text-4xl text-teal-400">{s.value}</p>
              <p className="text-sm text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* D. VẤN ĐỀ & GIẢI PHÁP */}
      <section className="bg-white py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Giải quyết điểm nghẽn thực tiễn</h2>
            <p className="text-muted-foreground mt-2">
              Được thiết kế dựa trên khảo sát 152 cán bộ tại 10 đơn vị cấp xã
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold text-red-600 mb-4 text-lg">Thực trạng</h3>
              <ul className="space-y-3">
                {PROBLEMS.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-teal-600 mb-4 text-lg">Với CivicAI</h3>
              <ul className="space-y-3">
                {SOLUTIONS.map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* E. 7 TÁC TỬ AI */}
      <section id="features" className="bg-slate-50 py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Hệ đa tác tử AI chuyên biệt</h2>
            <p className="text-muted-foreground mt-2">
              Các tác tử cộng tác với nhau, con người giữ quyền quyết định
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENTS.map(({ Icon, name, desc, badge, badgeCls }) => (
              <div key={name} className="rounded-xl border bg-white shadow-sm p-5 flex flex-col gap-3">
                <div className="rounded-lg bg-teal-50 p-2.5 w-fit">
                  <Icon className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{name}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium ${badgeCls}`}>
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* F. BẢO MẬT */}
      <section className="bg-teal-950 py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Triển khai tự chủ, dữ liệu nội bộ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {SECURITY.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white/10 rounded-xl p-6 text-white">
                <Icon className="h-7 w-7 text-teal-400 mb-3" />
                <p className="font-semibold mb-2">{title}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* G. CTA */}
      <section className="bg-slate-900 py-20 text-center">
        <div className="container flex flex-col items-center gap-6">
          <h2 className="text-3xl font-bold text-white">
            Sẵn sàng nâng cao năng suất hành chính?
          </h2>
          <Link href="/register">
            <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-white">
              Bắt đầu ngay
            </Button>
          </Link>
        </div>
      </section>

      {/* H. FOOTER */}
      <footer className="border-t py-8">
        <p className="text-center text-sm text-slate-500">
          © 2025 CivicAI · Trường Đại học Sư phạm TP.HCM · Sở KH&CN TP.HCM
        </p>
      </footer>

      <ChatWidget />
    </main>
  );
}
