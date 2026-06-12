"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import Cookies from "js-cookie";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const FEATURES = [
  "Soạn thảo văn bản hành chính với AI",
  "Tra cứu quy định pháp luật tức thời",
  "Kho tri thức 7.500+ văn bản",
  "Bảo mật dữ liệu cơ quan",
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const token = await authApi.login(data.email, data.password);
      Cookies.set("access_token", token.access_token, { expires: 1 });
      router.push("/dashboard");
    } catch {
      setError("Email hoặc mật khẩu không đúng");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-teal-700 to-teal-900 text-white">
        <div className="flex items-center gap-2">
          <Building2 className="h-7 w-7" />
          <span className="text-xl font-bold tracking-tight">CivicAI</span>
        </div>
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Nền tảng AI hỗ trợ<br />hành chính công
            </h2>
            <p className="mt-3 text-teal-200 text-sm leading-relaxed">
              Giúp cán bộ soạn thảo văn bản nhanh hơn, tra cứu chính xác hơn,
              và quản lý tài liệu hiệu quả hơn.
            </p>
          </div>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-teal-100">
                <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-teal-400 text-xs">© 2025 CivicAI. Bảo lưu mọi quyền.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Building2 className="h-6 w-6 text-teal-600" />
            <span className="text-lg font-bold text-teal-700">CivicAI</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Nhập thông tin tài khoản để tiếp tục
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
