"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ocrApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, ScanText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OcrJob {
  id: string;
  user_id: string;
  filename: string;
  status: "pending" | "processing" | "done" | "error";
  text: string | null;
  formatted_text: string | null;
  page_count: number | null;
  char_count: number | null;
  error_msg: string | null;
  created_at: string;
}

interface OcrJobListResponse {
  items: OcrJob[];
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function StatusBadge({ status }: { status: OcrJob["status"] }) {
  if (status === "done") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
        ✓ Hoàn tất
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
        ✗ Lỗi
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">
        <Loader2 className="size-3 animate-spin" />
        Đang OCR...
      </span>
    );
  }
  // pending
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">
      ⏳ Chờ xử lý
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["ocr-jobs"],
    queryFn: async () => {
      const res = await ocrApi.getJobs({ limit: 50 });
      return res.data as OcrJobListResponse;
    },
    // Function form: receives the Query object so we can inspect cached data
    // without creating a circular reference on the `data` variable above
    refetchInterval: (query) => {
      const cached = query.state.data as OcrJobListResponse | undefined;
      const hasActive = cached?.items?.some(
        (j) => j.status === "pending" || j.status === "processing",
      );
      return hasActive ? 5000 : false;
    },
  });

  const handleExport = async (job: OcrJob, format: "docx" | "pdf") => {
    try {
      // Fetch full job to get text (list response may not include text)
      const fullRes = await ocrApi.getJob(job.id);
      const fullJob = fullRes.data as OcrJob;
      const textToExport = fullJob.formatted_text || fullJob.text || "";
      const filename = fullJob.filename;

      const res = await ocrApi.export(textToExport, filename, format);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^.]+$/, "")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Lỗi xuất file", variant: "destructive" });
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">OCR Văn bản</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/ocr/new">
            <ScanText className="w-4 h-4 mr-2" />
            OCR PDF mới
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Lịch sử các lần OCR ({total} văn bản)
      </p>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <ScanText className="h-12 w-12 opacity-20" />
          <p className="text-sm">Chưa có lịch sử OCR nào.</p>
          <p className="text-xs">
            <Link
              href="/dashboard/ocr/new"
              className="text-primary underline underline-offset-2"
            >
              Bắt đầu OCR ngay
            </Link>
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên file</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[90px]">Số trang</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[110px]">Số ký tự</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[150px]">Ngày tạo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[130px]">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[150px]">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{job.filename}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{job.page_count ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {job.char_count != null ? job.char_count.toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(job.created_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {job.status === "done" && (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/ocr/${job.id}`}>Xem</Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExport(job, "docx")}>
                                Tải Word
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(job, "pdf")}>
                                Tải PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                      {(job.status === "pending" || job.status === "processing") && (
                        <span className="text-xs text-muted-foreground">Đang xử lý...</span>
                      )}
                      {job.status === "error" && (
                        <Button
                          variant="outline"
                          size="sm"
                          title={job.error_msg ?? "Lỗi không xác định"}
                        >
                          Chi tiết lỗi
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
