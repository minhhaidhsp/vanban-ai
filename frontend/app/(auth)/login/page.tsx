"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import Cookies from "js-cookie";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (token) router.replace("/dashboard");
  }, [router]);

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white">

      {/* Watermark SVG */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <svg viewBox="0 0 1400 900" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <circle cx="700" cy="400" r="300" fill="none" stroke="var(--brand-500)" strokeWidth="1.5"/>
          <circle cx="700" cy="400" r="250" fill="none" stroke="var(--brand-500)" strokeWidth="1"/>
          <circle cx="700" cy="400" r="200" fill="none" stroke="var(--brand-500)" strokeWidth="0.8"/>
          <polygon points="700,100 725,180 810,180 743,230 768,310 700,260 632,310 657,230 590,180 675,180" fill="var(--brand-500)"/>
        </svg>
      </div>

      {/* Wave bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1400 180" preserveAspectRatio="none" className="w-full">
          <path d="M0,60 C300,20 600,120 900,60 C1100,20 1250,100 1400,50 L1400,180 L0,180 Z" fill="var(--brand-500)" opacity="0.9"/>
          <path d="M0,80 C250,50 550,140 850,80 C1050,40 1250,110 1400,70 L1400,180 L0,180 Z" fill="var(--brand-600)"/>
        </svg>
      </div>

      {/* Header — tên hệ thống */}
      <div className="relative z-10 mb-4 text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[var(--brand-600)] leading-snug whitespace-nowrap">
          HỆ THỐNG XỬ LÝ VĂN BẢN HÀNH CHÍNH ĐIỆN TỬ
        </h1>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[460px] rounded-xl bg-white px-12 py-12 shadow-[0_4px_32px_rgba(0,0,0,0.12)]">
        <h2 className="mb-7 text-center text-3xl font-bold text-gray-900 tracking-tight">
          Đăng nhập
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-base font-medium text-gray-900">
              Email <span className="text-[var(--brand-500)]">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@gmail.com"
              className="h-12 border-[#ccd0d7] focus-visible:ring-[var(--brand-500)] focus-visible:border-[var(--brand-500)]"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-base font-medium text-gray-900">
              Mật khẩu <span className="text-[var(--brand-500)]">*</span>
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="h-12 pr-10 border-[#ccd0d7] focus-visible:ring-[var(--brand-500)] focus-visible:border-[var(--brand-500)]"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-base text-gray-900 cursor-pointer">
              <input type="checkbox" className="accent-[var(--brand-500)]" />
              Ghi nhớ đăng nhập
            </label>
            <Link href="/forgot-password" className="text-base font-medium text-[var(--brand-500)] hover:text-[var(--brand-700)]">
              Quên mật khẩu
            </Link>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[var(--brand-600)] py-3.5 text-base font-bold text-white transition-colors hover:bg-[var(--brand-700)] disabled:opacity-60 tracking-wide"
          >
            {isSubmitting ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}
          </button>
        </form>

        <p className="mt-5 text-center text-base text-gray-900">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-[var(--brand-500)] hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-8 z-10 text-xs text-white space-y-0.5">
        <div>© 2025 Trợ Lý Hành Chính — Bảo lưu mọi quyền</div>
      </div>
    </div>
  );
}
