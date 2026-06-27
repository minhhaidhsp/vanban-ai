"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const res = await authApi.forgotPassword(data.email);
    setMessage(res.message);
    setDevToken(res.dev_token ?? null);
    setSubmitted(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <svg viewBox="0 0 1400 900" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <circle cx="700" cy="400" r="300" fill="none" stroke="#dc2626" strokeWidth="1.5"/>
          <circle cx="700" cy="400" r="250" fill="none" stroke="#dc2626" strokeWidth="1"/>
          <circle cx="700" cy="400" r="200" fill="none" stroke="#dc2626" strokeWidth="0.8"/>
          <polygon points="700,100 725,180 810,180 743,230 768,310 700,260 632,310 657,230 590,180 675,180" fill="#dc2626"/>
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1400 180" preserveAspectRatio="none" className="w-full">
          <path d="M0,60 C300,20 600,120 900,60 C1100,20 1250,100 1400,50 L1400,180 L0,180 Z" fill="#dc2626" opacity="0.9"/>
          <path d="M0,80 C250,50 550,140 850,80 C1050,40 1250,110 1400,70 L1400,180 L0,180 Z" fill="#b9000e"/>
        </svg>
      </div>

      <div className="relative z-10 mb-4 text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[#b9000e] leading-snug whitespace-nowrap">
          HỆ THỐNG XỬ LÝ VĂN BẢN HÀNH CHÍNH ĐIỆN TỬ
        </h1>
      </div>

      <div className="relative z-10 w-full max-w-[460px] rounded-xl bg-white px-12 py-12 shadow-[0_4px_32px_rgba(0,0,0,0.12)]">
        {!submitted ? (
          <>
            <h2 className="mb-2 text-center text-3xl font-bold text-gray-900">Quên mật khẩu</h2>
            <p className="mb-7 text-center text-base text-gray-500">
              Nhập email để nhận hướng dẫn đặt lại mật khẩu
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-base font-medium text-gray-900">
                  Email <span className="text-red-600">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="example@gmail.com"
                  className="h-12 border-[#ccd0d7] focus-visible:ring-[#dc2626] focus-visible:border-[#dc2626]"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-[#b9000e] py-3.5 text-base font-bold text-white hover:bg-[#a60002] disabled:opacity-60 tracking-wide"
              >
                {isSubmitting ? "Đang gửi..." : "GỬI YÊU CẦU"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-base text-gray-700">{message}</p>
            {devToken && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <p className="text-xs font-semibold text-yellow-800 mb-2">🛠 DEV MODE — Token để test:</p>
                <code className="text-xs text-yellow-900 break-all">{devToken}</code>
                <Link
                  href={`/reset-password?token=${devToken}`}
                  className="mt-3 block text-center text-sm font-medium text-[#dc2626] hover:underline"
                >
                  → Đặt lại mật khẩu ngay
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-base text-gray-900">
          <Link href="/login" className="font-medium text-[#dc2626] hover:underline">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>

      <div className="absolute bottom-6 left-8 z-10 text-xs text-white">
        © 2025 VănBản.AI — Bảo lưu mọi quyền
      </div>
    </div>
  );
}
