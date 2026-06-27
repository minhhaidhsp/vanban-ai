"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";

const schema = z.object({
  new_password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirm_password"],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token, router]);

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      await authApi.resetPassword(token, data.new_password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.");
    }
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
        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Đặt lại thành công!</h2>
            <p className="text-base text-gray-600">Đang chuyển về trang đăng nhập...</p>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-center text-3xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
            <p className="mb-7 text-center text-base text-gray-500">Nhập mật khẩu mới cho tài khoản</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-base font-medium text-gray-900">
                  Mật khẩu mới <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    className="h-12 pr-10 border-[#ccd0d7] focus-visible:ring-[#dc2626] focus-visible:border-[#dc2626]"
                    {...register("new_password")}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
                {errors.new_password && <p className="text-xs text-red-600">{errors.new_password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-base font-medium text-gray-900">
                  Xác nhận mật khẩu <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    className="h-12 pr-10 border-[#ccd0d7] focus-visible:ring-[#dc2626] focus-visible:border-[#dc2626]"
                    {...register("confirm_password")}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
                {errors.confirm_password && <p className="text-xs text-red-600">{errors.confirm_password.message}</p>}
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-[#b9000e] py-3.5 text-base font-bold text-white hover:bg-[#a60002] disabled:opacity-60 tracking-wide"
              >
                {isSubmitting ? "Đang xử lý..." : "ĐẶT LẠI MẬT KHẨU"}
              </button>
            </form>
          </>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
