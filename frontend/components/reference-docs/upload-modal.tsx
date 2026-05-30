"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refDocApi, type RefDoc } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LOAI_VAN_BAN_OPTIONS = [
  "Nghị định", "Thông tư", "Quyết định", "Công văn",
  "Báo cáo", "Tờ trình", "Kế hoạch", "Hướng dẫn", "Khác",
];

const HIEU_LUC_OPTIONS = [
  { value: "chua", label: "Chưa xác định" },
  { value: "con_hieu_luc", label: "Còn hiệu lực" },
  { value: "het_hieu_luc", label: "Hết hiệu lực" },
  { value: "mot_phan", label: "Một phần" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Riêng tư (chỉ mình tôi)" },
  { value: "org",     label: "Cơ quan" },
  { value: "system",  label: "Hệ thống (mọi người)" },
];

interface FormState {
  title: string;
  loai_van_ban: string;
  so_ki_hieu: string;
  ngay_ban_hanh: string;
  co_quan_ban_hanh: string;
  nguoi_ky: string;
  trich_yeu: string;
  hieu_luc: string;
  visibility: string;
  tu_khoa: string;
}

const emptyForm = (): FormState => ({
  title: "", loai_van_ban: "", so_ki_hieu: "",
  ngay_ban_hanh: "", co_quan_ban_hanh: "", nguoi_ky: "",
  trich_yeu: "", hieu_luc: "chua", visibility: "private", tu_khoa: "",
});

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  editing?: RefDoc | null;
  onUploaded?: (docId: string) => void;
}

export function UploadModal({ open, onClose, editing, onUploaded }: UploadModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          title: editing.title,
          loai_van_ban: editing.loai_van_ban,
          so_ki_hieu: editing.so_ki_hieu,
          ngay_ban_hanh: editing.ngay_ban_hanh ?? "",
          co_quan_ban_hanh: editing.co_quan_ban_hanh,
          nguoi_ky: editing.nguoi_ky ?? "",
          trich_yeu: editing.trich_yeu,
          hieu_luc: editing.hieu_luc,
          visibility: editing.visibility ?? "private",
          tu_khoa: editing.tu_khoa.join(", "),
        }
      : emptyForm()
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const buildPayload = () => ({
    title: form.title || form.trich_yeu,
    loai_van_ban: form.loai_van_ban,
    so_ki_hieu: form.so_ki_hieu,
    ngay_ban_hanh: form.ngay_ban_hanh || null,
    co_quan_ban_hanh: form.co_quan_ban_hanh,
    nguoi_ky: form.nguoi_ky || null,
    trich_yeu: form.trich_yeu,
    hieu_luc: form.hieu_luc,
    visibility: form.visibility,
    tu_khoa: form.tu_khoa ? form.tu_khoa.split(",").map((s) => s.trim()).filter(Boolean) : [],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let doc: RefDoc;
      if (editing) {
        doc = await refDocApi.update(editing.id, buildPayload());
      } else {
        doc = await refDocApi.create(buildPayload() as Parameters<typeof refDocApi.create>[0]);
      }
      if (selectedFile) {
        setUploadProgress(0);
        doc = await refDocApi.upload(doc.id, selectedFile, setUploadProgress);
      }
      return doc;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["reference-docs"] });
      toast({ title: editing ? "Đã cập nhật văn bản" : "Đã thêm văn bản" });
      if (!editing && selectedFile && onUploaded) {
        onUploaded(doc.id);
      }
      onClose();
    },
    onError: () => {
      toast({ title: "Lưu thất bại", variant: "destructive" });
    },
  });

  const isValid = form.trich_yeu.trim() && form.loai_van_ban && form.co_quan_ban_hanh.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saveMutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Chỉnh sửa văn bản" : "Thêm văn bản tham chiếu"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <p className="text-sm">Kéo thả file hoặc nhấn để chọn</p>
                <p className="text-xs">PDF, Word, Excel, TXT</p>
                {editing?.file_path && (
                  <p className="text-xs text-primary">Đã có file. Chọn file mới để thay thế.</p>
                )}
              </div>
            )}
          </div>

          {/* Upload progress */}
          {saveMutation.isPending && selectedFile && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Metadata form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Trích yếu <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.trich_yeu}
                onChange={(e) => set("trich_yeu")(e.target.value)}
                placeholder="Nội dung trích yếu văn bản..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Loại văn bản <span className="text-destructive">*</span></Label>
              <Select value={form.loai_van_ban} onValueChange={set("loai_van_ban")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn loại..." />
                </SelectTrigger>
                <SelectContent>
                  {LOAI_VAN_BAN_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Số/Ký hiệu</Label>
              <Input
                value={form.so_ki_hieu}
                onChange={(e) => set("so_ki_hieu")(e.target.value)}
                placeholder="123/2024/NĐ-CP"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Cơ quan ban hành <span className="text-destructive">*</span></Label>
              <Input
                value={form.co_quan_ban_hanh}
                onChange={(e) => set("co_quan_ban_hanh")(e.target.value)}
                placeholder="Chính phủ, Bộ..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Ngày ban hành</Label>
              <Input
                type="date"
                value={form.ngay_ban_hanh}
                onChange={(e) => set("ngay_ban_hanh")(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Người ký</Label>
              <Input
                value={form.nguoi_ky}
                onChange={(e) => set("nguoi_ky")(e.target.value)}
                placeholder="Họ và tên..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Hiệu lực</Label>
              <Select value={form.hieu_luc} onValueChange={set("hieu_luc")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HIEU_LUC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Phạm vi</Label>
              <Select value={form.visibility} onValueChange={set("visibility")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Từ khóa</Label>
              <Input
                value={form.tu_khoa}
                onChange={(e) => set("tu_khoa")(e.target.value)}
                placeholder="Nhập từ khóa, cách nhau bằng dấu phẩy..."
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Hủy
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {editing ? "Cập nhật" : "Thêm văn bản"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
