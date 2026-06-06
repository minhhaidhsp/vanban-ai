import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Zap, Shield } from "lucide-react";
import ChatWidget from "@/components/public/ChatWidget";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <FileText className="h-6 w-6 text-primary" />
            VănBản.AI
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button>Bắt đầu miễn phí</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 container flex flex-col items-center justify-center gap-8 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Xử lý văn bản thông minh
          <br />
          <span className="text-primary">với sức mạnh AI</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          VănBản.AI giúp bạn phân tích, tóm tắt và tìm kiếm thông minh trong
          tài liệu của mình bằng công nghệ AI tiên tiến nhất.
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <Button size="lg">Dùng thử ngay</Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline">
              Tìm hiểu thêm
            </Button>
          </Link>
        </div>
      </section>

      <section className="container grid grid-cols-3 gap-8 py-16">
        {[
          {
            icon: <FileText className="h-8 w-8 text-primary" />,
            title: "Quản lý tài liệu",
            desc: "Upload và quản lý tài liệu của bạn một cách dễ dàng.",
          },
          {
            icon: <Zap className="h-8 w-8 text-primary" />,
            title: "Phân tích nhanh",
            desc: "AI phân tích và trích xuất thông tin quan trọng trong tích tắc.",
          },
          {
            icon: <Shield className="h-8 w-8 text-primary" />,
            title: "Bảo mật dữ liệu",
            desc: "Dữ liệu của bạn được mã hóa và bảo vệ tuyệt đối.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border p-6 flex flex-col gap-3"
          >
            {item.icon}
            <h3 className="font-semibold text-lg">{item.title}</h3>
            <p className="text-muted-foreground text-sm">{item.desc}</p>
          </div>
        ))}
      </section>
      <ChatWidget />
    </main>
  );
}
