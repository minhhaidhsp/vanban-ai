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

const registerSchema = z.object({
  full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const FEATURES = [
  "Soạn thảo văn bản hành chính với AI",
  "Tra cứu quy định pháp luật tức thời",
  "Kho tri thức 7.500+ văn bản",
  "Bảo mật dữ liệu cơ quan",
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      await authApi.register(data.full_name, data.email, data.password);
      router.push("/login?registered=true");
    } catch {
      setError("Email đã được sử dụng hoặc có lỗi xảy ra");
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
            <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Điền thông tin để đăng ký tài khoản CivicAI
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input id="full_name" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

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
              {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
