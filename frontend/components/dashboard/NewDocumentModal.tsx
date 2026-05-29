"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { documentApi, refDocApi, documentSourcesApi } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewDocumentModalProps {
  open: boolean;
  onClose: () => void;
}

// ── Poll helper ───────────────────────────────────────────────────────────────

async function pollUntilDone(jobIds: string[]): Promise<Array<{ jobId: string; docId: string | null }>> {
  const results: Array<{ jobId: string; docId: string | null }> = jobIds.map((id) => ({ jobId: id, docId: null }));

  await new Promise<void>((resolve) => {
    const check = async () => {
      const statuses = await Promise.all(
        jobIds.map((id) => refDocApi.getJobStatus(id).catch(() => null))
      );
      statuses.forEach((s, i) => {
        if (s?.doc_id) results[i].docId = s.doc_id;
      });
      const allDone = statuses.every((s) => !s || s.status === "done" || s.status === "failed");
      if (allDone) resolve();
      else setTimeout(check, 2500);
    };
    check();
  });

  return results;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewDocumentModal({ open, onClose }: NewDocumentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setFiles([]);
    }
  }, [open]);

  const addFiles = (incoming: File[]) =>
    setFiles((prev) => [...prev, ...incoming].slice(0, 10));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files).filter(
      (f) => f.type.includes("pdf") || f.type.includes("word") || f.type.includes("docx")
    ));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      // a. Create blank document
      const doc = await documentApi.create({ title: "Văn bản mới" });
      const docId = doc.id;

      // b. Upload reference files (if any) and add as sources
      if (files.length > 0) {
        try {
          const batchRes = await refDocApi.uploadBatch(files, "private");
          const jobIds = batchRes.jobs.map((j) => j.job_id);
          const results = await pollUntilDone(jobIds);
          await Promise.all(
            results
              .filter((r) => !!r.docId)
              .map((r) => documentSourcesApi.add(docId, r.docId!).catch(() => { /* skip duplicates */ }))
          );
        } catch (uploadErr) {
          console.error("[NewDocumentModal] upload batch failed:", uploadErr);
        }
      }

      // c. Navigate to editor with welcome state
      onClose();
      router.push(`/dashboard/documents/${docId}?new=true`);
    } catch (err: unknown) {
      const e = err as { response?: { data: unknown }; message?: string };
      console.error("[NewDocumentModal] create failed:", e?.response?.data ?? e?.message ?? err);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {loading ? "Đang chuẩn bị..." : "Tài liệu tham chiếu (tuỳ chọn)"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Loading ──────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-700">Đang tạo văn bản...</p>
            {files.length > 0 && (
              <div className="w-full space-y-2">
                <p className="text-xs text-gray-500 text-center">
                  Đang xử lý {files.length} tài liệu tham chiếu...
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="flex-1 truncate text-xs text-gray-600" title={f.name}>{f.name}</span>
                      <Loader2 className="h-3 w-3 animate-spin text-blue-300 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Upload ───────────────────────────────────────────── */}
        {!loading && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx" multiple onChange={handleFileChange} />
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Kéo thả PDF, Word để AI tham khảo khi soạn thảo
              </p>
              <p className="text-xs text-gray-400 mt-1">Tối đa 10 file</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                    <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="flex-1 truncate max-w-[280px] text-xs" title={f.name}>{f.name}</span>
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleContinue}>
                Tiếp tục <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
