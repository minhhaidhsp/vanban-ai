"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, CircleDot,
  MinusCircle, Upload, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { hoSoApi, type HoSoOut, type BuocOut } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

const BADGE_HS: Record<string, { label: string; className: string }> = {
  moi:         { label: "Mới",          className: "bg-gray-100 text-gray-700" },
  dang_xu_ly:  { label: "Đang xử lý",  className: "bg-blue-100 text-blue-700" },
  cho_bo_sung: { label: "Chờ bổ sung", className: "bg-amber-100 text-amber-700" },
  hoan_thanh:  { label: "Hoàn thành",  className: "bg-green-100 text-green-700" },
};

const BADGE_BUOC: Record<string, { label: string; className: string }> = {
  cho:      { label: "Chờ",       className: "bg-gray-100 text-muted-foreground" },
  dang_lam: { label: "Đang làm",  className: "bg-blue-100 text-blue-700" },
  xong:     { label: "Xong",      className: "bg-green-100 text-green-700" },
  bo_qua:   { label: "Bỏ qua",    className: "bg-gray-100 text-muted-foreground" },
};

function BuocIcon({ trang_thai }: { trang_thai: string }) {
  if (trang_thai === "xong")     return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
  if (trang_thai === "dang_lam") return <CircleDot    className="h-5 w-5 text-primary shrink-0" />;
  if (trang_thai === "bo_qua")   return <MinusCircle  className="h-5 w-5 text-muted-foreground/40 shrink-0" />;
  return <Clock className="h-5 w-5 text-muted-foreground/40 shrink-0" />;
}

export default function HoSoDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const fileRef = useRef<HTMLInputElement>(null);

  const [hoSo, setHoSo] = useState<HoSoOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [buocKetQua, setBuocKetQua] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    hoSoApi.get(id)
      .then((data) => {
        setHoSo(data);
        const kq: Record<string, string> = {};
        data.buoc.forEach((b) => { kq[b.id] = b.ket_qua ?? ""; });
        setBuocKetQua(kq);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleCompleteBuoc = async (buoc: BuocOut) => {
    setCompleting(buoc.id);
    try {
      await hoSoApi.updateBuoc(id, buoc.id, {
        trang_thai: "xong",
        ket_qua: buocKetQua[buoc.id] || undefined,
      });
      load();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật bước. Vui lòng thử lại.");
    } finally {
      setCompleting(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!hoSo) return;
    setUploading(true);
    try {
      await hoSoApi.uploadFile(hoSo.id, file, "ho_so_goc");
      load();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi upload file.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (!hoSo) {
    return (
      <div className="text-center text-muted-foreground">Không tìm thấy hồ sơ</div>
    );
  }

  const hsBadge = BADGE_HS[hoSo.trang_thai] ?? { label: hoSo.trang_thai, className: "bg-gray-100 text-gray-700" };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/ho-so")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{hoSo.ma_ho_so}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${hsBadge.className}`}>
              {hsBadge.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{hoSo.loai_thu_tuc}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Cột trái: thông tin hồ sơ ── */}
        <div className="col-span-1 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Thông tin hồ sơ
            </h2>

            <div>
              <p className="text-xs text-muted-foreground">Mã hồ sơ</p>
              <p className="text-sm font-mono font-medium text-primary">{hoSo.ma_ho_so}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tên công dân</p>
              <p className="text-sm font-medium">{hoSo.ten_chu_ho_so}</p>
            </div>
            {hoSo.so_dien_thoai && (
              <div>
                <p className="text-xs text-muted-foreground">Số điện thoại</p>
                <p className="text-sm">{hoSo.so_dien_thoai}</p>
              </div>
            )}
            {hoSo.dia_chi && (
              <div>
                <p className="text-xs text-muted-foreground">Địa chỉ</p>
                <p className="text-sm">{hoSo.dia_chi}</p>
              </div>
            )}
            {hoSo.ma_dvc && (
              <div>
                <p className="text-xs text-muted-foreground">Mã DVC</p>
                <p className="text-sm">{hoSo.ma_dvc}</p>
              </div>
            )}
            {hoSo.han_xu_ly && (
              <div>
                <p className="text-xs text-muted-foreground">Hạn xử lý</p>
                <p className="text-sm">{fmtDate(hoSo.han_xu_ly)}</p>
              </div>
            )}
            {hoSo.mo_ta && (
              <div>
                <p className="text-xs text-muted-foreground">Mô tả</p>
                <p className="text-sm">{hoSo.mo_ta}</p>
              </div>
            )}
            {hoSo.ly_do_bo_sung && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">Lý do yêu cầu bổ sung</p>
                <p className="text-sm text-amber-800">{hoSo.ly_do_bo_sung}</p>
              </div>
            )}
          </div>

          {/* Files */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tài liệu đính kèm
              </h2>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Upload className="h-3 w-3" />
                {uploading ? "Đang upload..." : "Upload thêm"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleUploadFile(e.target.files[0]); }}
            />
            {hoSo.files.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có tài liệu nào</p>
            ) : (
              <div className="space-y-2">
                {hoSo.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.ten_file}</span>
                    {f.kich_thuoc && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {(f.kich_thuoc / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Cột phải: stepper 5 bước ── */}
        <div className="col-span-2">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Quy trình xử lý
            </h2>
            <div className="space-y-4">
              {hoSo.buoc.map((buoc) => {
                const bb = BADGE_BUOC[buoc.trang_thai] ?? {
                  label: buoc.trang_thai,
                  className: "bg-gray-100 text-muted-foreground",
                };
                const isDangLam = buoc.trang_thai === "dang_lam";
                const isXong    = buoc.trang_thai === "xong";
                const isCho     = buoc.trang_thai === "cho";

                return (
                  <div
                    key={buoc.id}
                    className={cn(
                      "rounded-lg border p-4 transition-all",
                      isDangLam ? "bg-primary/5 border-primary/20"
                      : isXong  ? "bg-emerald-50/50 border-emerald-200"
                      : isCho   ? "bg-card border opacity-60"
                      : "bg-card border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <BuocIcon trang_thai={buoc.trang_thai} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium">
                            Bước {buoc.thu_tu}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bb.className}`}>
                            {bb.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-0.5">{buoc.ten_buoc}</p>
                        {buoc.mo_ta && (
                          <p className="text-xs text-muted-foreground mt-1">{buoc.mo_ta}</p>
                        )}

                        {/* Kết quả nếu xong */}
                        {isXong && buoc.ket_qua && (
                          <div className="mt-2 rounded border border-emerald-200 bg-card px-3 py-2 text-sm">
                            {buoc.ket_qua}
                          </div>
                        )}
                        {isXong && buoc.hoan_thanh_luc && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Hoàn thành lúc {fmtDateTime(buoc.hoan_thanh_luc)}
                          </p>
                        )}

                        {/* Đang làm: textarea + buttons */}
                        {isDangLam && (
                          <div className="mt-3 space-y-3">
                            <Textarea
                              rows={3}
                              value={buocKetQua[buoc.id] ?? ""}
                              onChange={(e) =>
                                setBuocKetQua((prev) => ({ ...prev, [buoc.id]: e.target.value }))
                              }
                              placeholder="Ghi chú kết quả xử lý..."
                              className="resize-none"
                            />
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                onClick={() => handleCompleteBuoc(buoc)}
                                disabled={completing === buoc.id}
                              >
                                {completing === buoc.id ? "Đang lưu..." : "Hoàn thành bước"}
                              </Button>
                              {buoc.loai_hanh_dong === "soan_thao" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push("/dashboard/documents/new")}
                                  className="gap-1.5"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Mở Editor
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
