"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { refDocApi, type MetadataConfirmRequest } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const HIEU_LUC_OPTIONS = [
  { value: "chua", label: "Chưa xác định" },
  { value: "con_hieu_luc", label: "Còn hiệu lực" },
  { value: "het_hieu_luc", label: "Hết hiệu lực" },
  { value: "mot_phan", label: "Một phần" },
];

const CONFIDENCE_TIMEOUT_MS = 60_000;

function ConfidenceBadge({ level }: { level?: string }) {
  if (!level || level === "unknown") return null;
  const map: Record<string, { label: string; className: string }> = {
    high:   { label: "Cao",    className: "bg-green-100 text-green-700 border-green-200" },
    medium: { label: "Trung bình", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    low:    { label: "Thấp",   className: "bg-red-100 text-red-700 border-red-200" },
  };
  const cfg = map[level];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={cn("ml-1 text-xs px-1.5 py-0", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

interface FormState {
  so_ki_hieu: string;
  ngay_ban_hanh: string;
  co_quan_ban_hanh: string;
  nguoi_ky: string;
  trich_yeu: string;
  hieu_luc: string;
  tom_tat: string;
}

interface MetadataReviewCardProps {
  docId: string | null;
  onClose: () => void;
}

export function MetadataReviewCard({ docId, onClose }: MetadataReviewCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [timedOut, setTimedOut] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [form, setForm] = useState<FormState>({
    so_ki_hieu: "",
    ngay_ban_hanh: "",
    co_quan_ban_hanh: "",
    nguoi_ky: "",
    trich_yeu: "",
    hieu_luc: "chua",
    tom_tat: "",
  });
  const [populated, setPopulated] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["metadata-preview", docId],
    queryFn: () => refDocApi.getMetadataPreview(docId!),
    enabled: !!docId && !timedOut,
    refetchInterval: (query) => {
      if (query.state.data?.status === "ready") return false;
      if (Date.now() - startTime > CONFIDENCE_TIMEOUT_MS) return false;
      return 3000;
    },
  });

  // Timeout watchdog
  useEffect(() => {
    if (!docId) return;
    const id = setTimeout(() => setTimedOut(true), CONFIDENCE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [docId]);

  // Populate form once when data arrives
  useEffect(() => {
    if (data?.status === "ready" && data.fields && !populated) {
      const f = data.fields;
      setForm({
        so_ki_hieu: f.so_ki_hieu ?? "",
        ngay_ban_hanh: f.ngay_ban_hanh ?? "",
        co_quan_ban_hanh: f.co_quan_ban_hanh ?? "",
        nguoi_ky: f.nguoi_ky ?? "",
        trich_yeu: f.trich_yeu ?? "",
        hieu_luc: f.hieu_luc ?? "chua",
        tom_tat: f.tom_tat ?? "",
      });
      setPopulated(true);
    }
  }, [data, populated]);

  const confirmMutation = useMutation({
    mutationFn: () => {
      const payload: MetadataConfirmRequest = {
        so_ki_hieu: form.so_ki_hieu || null,
        ngay_ban_hanh: form.ngay_ban_hanh || null,
        co_quan_ban_hanh: form.co_quan_ban_hanh || null,
        nguoi_ky: form.nguoi_ky || null,
        trich_yeu: form.trich_yeu || null,
        hieu_luc: form.hieu_luc || null,
        tom_tat: form.tom_tat || null,
        can_cu: data?.fields?.can_cu ?? [],
      };
      return refDocApi.confirmMetadata(docId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-docs"] });
      queryClient.removeQueries({ queryKey: ["metadata-preview", docId] });
      toast({ title: "Đã lưu thông tin văn bản" });
      onClose();
    },
    onError: () => {
      toast({ title: "Lưu thất bại", variant: "destructive" });
    },
  });

  const conf = data?.confidence ?? {};
  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isReady = data?.status === "ready";
  const isProcessing = !timedOut && (isLoading || data?.status === "processing" || data?.status === "not_available");

  const handleClose = () => {
    queryClient.removeQueries({ queryKey: ["metadata-preview", docId] });
    onClose();
  };

  return (
    <Dialog open={!!docId} onOpenChange={(o) => { if (!o && !confirmMutation.isPending) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Xem lại thông tin trích xuất
          </DialogTitle>
        </DialogHeader>

        {/* Processing state */}
        {isProcessing && (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Đang phân tích nội dung văn bản...</p>
          </div>
        )}

        {/* Timeout state */}
        {timedOut && !isReady && (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <p className="text-sm">Phân tích mất quá nhiều thời gian.</p>
            <Button variant="outline" size="sm" onClick={handleClose}>Đóng</Button>
          </div>
        )}

        {/* Form — shown when ready */}
        {isReady && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              AI đã trích xuất thông tin bên dưới. Vui lòng kiểm tra và chỉnh sửa nếu cần trước khi lưu.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Trích yếu */}
              <div className="col-span-2">
                <Label className="flex items-center">
                  Trích yếu
                  <ConfidenceBadge level={conf.trich_yeu} />
                </Label>
                <Textarea
                  value={form.trich_yeu}
                  onChange={(e) => set("trich_yeu")(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Số/Ký hiệu */}
              <div>
                <Label className="flex items-center">
                  Số/Ký hiệu
                  <ConfidenceBadge level={conf.so_ki_hieu} />
                </Label>
                <Input
                  value={form.so_ki_hieu}
                  onChange={(e) => set("so_ki_hieu")(e.target.value)}
                  className="mt-1"
                  placeholder="123/2024/NĐ-CP"
                />
              </div>

              {/* Ngày ban hành */}
              <div>
                <Label className="flex items-center">
                  Ngày ban hành
                  <ConfidenceBadge level={conf.ngay_ban_hanh} />
                </Label>
                <Input
                  type="date"
                  value={form.ngay_ban_hanh}
                  onChange={(e) => set("ngay_ban_hanh")(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Cơ quan ban hành */}
              <div>
                <Label className="flex items-center">
                  Cơ quan ban hành
                  <ConfidenceBadge level={conf.co_quan_ban_hanh} />
                </Label>
                <Input
                  value={form.co_quan_ban_hanh}
                  onChange={(e) => set("co_quan_ban_hanh")(e.target.value)}
                  className="mt-1"
                  placeholder="Chính phủ, Bộ..."
                />
              </div>

              {/* Người ký */}
              <div>
                <Label className="flex items-center">
                  Người ký
                  <ConfidenceBadge level={conf.nguoi_ky} />
                </Label>
                <Input
                  value={form.nguoi_ky}
                  onChange={(e) => set("nguoi_ky")(e.target.value)}
                  className="mt-1"
                  placeholder="Họ và tên..."
                />
              </div>

              {/* Hiệu lực */}
              <div>
                <Label className="flex items-center">
                  Hiệu lực
                  <ConfidenceBadge level={conf.hieu_luc} />
                </Label>
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

              {/* Tóm tắt */}
              <div className="col-span-2">
                <Label className="flex items-center">
                  Tóm tắt
                  <ConfidenceBadge level={conf.tom_tat} />
                </Label>
                <Textarea
                  value={form.tom_tat}
                  onChange={(e) => set("tom_tat")(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Căn cứ — read-only list */}
              {(data.fields?.can_cu ?? []).length > 0 && (
                <div className="col-span-2">
                  <Label>Căn cứ pháp lý</Label>
                  <ul className="mt-1 space-y-1">
                    {(data.fields?.can_cu ?? []).map((c, i) => (
                      <li key={i} className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={confirmMutation.isPending}>
            Bỏ qua
          </Button>
          {isReady && (
            <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Xác nhận &amp; Lưu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
