"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { hoSoApi } from "@/lib/api";

const LOAI_THU_TUC_OPTIONS = [
  "Đăng ký thành lập hộ kinh doanh",
  "Đăng ký thay đổi nội dung đăng ký hộ kinh doanh",
  "Chấm dứt hoạt động hộ kinh doanh",
  "Đăng ký khai sinh",
  "Đăng ký kết hôn",
  "Đăng ký khai tử",
  "Cấp giấy xác nhận thường trú",
  "Cấp phép xây dựng",
  "Thủ tục hành chính khác",
];

export default function NewHoSoPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    loai_thu_tuc: "",
    ten_chu_ho_so: "",
    so_dien_thoai: "",
    dia_chi: "",
    ma_dvc: "",
    han_xu_ly: "",
    mo_ta: "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.loai_thu_tuc || !form.ten_chu_ho_so) return;
    setSubmitting(true);
    try {
      const created = await hoSoApi.create({
        loai_thu_tuc: form.loai_thu_tuc,
        ten_chu_ho_so: form.ten_chu_ho_so,
        so_dien_thoai: form.so_dien_thoai || undefined,
        dia_chi: form.dia_chi || undefined,
        ma_dvc: form.ma_dvc || undefined,
        han_xu_ly: form.han_xu_ly ? new Date(form.han_xu_ly).toISOString() : undefined,
        mo_ta: form.mo_ta || undefined,
      });
      if (selectedFile) {
        await hoSoApi.uploadFile(created.id, selectedFile, "ho_so_goc");
      }
      router.push(`/dashboard/ho-so/${created.id}`);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo hồ sơ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Tạo hồ sơ mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-6">
        {/* Loại thủ tục */}
        <div className="space-y-1.5">
          <Label>
            Loại thủ tục <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.loai_thu_tuc || undefined}
            onValueChange={(v) => set("loai_thu_tuc", v)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Chọn loại thủ tục --" />
            </SelectTrigger>
            <SelectContent>
              {LOAI_THU_TUC_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tên chủ hồ sơ */}
        <div className="space-y-1.5">
          <Label>
            Họ tên công dân <span className="text-destructive">*</span>
          </Label>
          <Input
            required
            value={form.ten_chu_ho_so}
            onChange={(e) => set("ten_chu_ho_so", e.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </div>

        {/* SDT + Mã DVC */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Số điện thoại</Label>
            <Input
              type="tel"
              value={form.so_dien_thoai}
              onChange={(e) => set("so_dien_thoai", e.target.value)}
              placeholder="0912345678"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mã DVC</Label>
            <Input
              value={form.ma_dvc}
              onChange={(e) => set("ma_dvc", e.target.value)}
              placeholder="OH-0096751/26"
            />
          </div>
        </div>

        {/* Địa chỉ */}
        <div className="space-y-1.5">
          <Label>Địa chỉ</Label>
          <Input
            value={form.dia_chi}
            onChange={(e) => set("dia_chi", e.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
          />
        </div>

        {/* Hạn xử lý */}
        <div className="space-y-1.5">
          <Label>Hạn xử lý</Label>
          <Input
            type="date"
            value={form.han_xu_ly}
            onChange={(e) => set("han_xu_ly", e.target.value)}
          />
        </div>

        {/* Mô tả */}
        <div className="space-y-1.5">
          <Label>Mô tả / Ghi chú</Label>
          <Textarea
            rows={3}
            value={form.mo_ta}
            onChange={(e) => set("mo_ta", e.target.value)}
            placeholder="Thông tin bổ sung về hồ sơ..."
            className="resize-none"
          />
        </div>

        {/* Upload file */}
        <div className="space-y-1.5">
          <Label>Upload hồ sơ gốc (PDF)</Label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                <Upload className="h-4 w-4 text-primary" />
                <span>{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                Kéo thả file PDF vào đây hoặc{" "}
                <span className="text-primary font-medium">chọn file</span>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Đang tạo..." : "Tạo hồ sơ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
