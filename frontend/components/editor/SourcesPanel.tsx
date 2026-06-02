"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentSourcesApi, refDocApi, type RefDoc } from "@/lib/api";
import { FileText, X, BookOpen, Loader2, Upload, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SourcePickerModal } from "./SourcePickerModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── UploadSourceModal ─────────────────────────────────────────────────────────

interface UploadSourceModalProps {
  open: boolean;
  onClose: () => void;
  onStartUpload: (files: File[]) => void;
}

function UploadSourceModal({ open, onClose, onStartUpload }: UploadSourceModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setFiles([]);
  }, [open]);

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const fresh = incoming.filter((f) => !existing.has(f.name));
      return [...prev, ...fresh].slice(0, 10);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files).filter(
      (f) => f.type.includes("pdf") || f.type.includes("word") || f.type.includes("docx")
    ));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    onStartUpload(files); // SourcesPanel closes modal + handles background upload
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload tài liệu tham chiếu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors",
              dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx" multiple onChange={handleFileInput} />
            <Upload className="h-7 w-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Kéo thả PDF, Word vào đây</p>
            <p className="text-xs text-gray-400 mt-1">Tối đa 10 file</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-white">
                  <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-sm truncate max-w-[200px] block" title={f.name}>
                    {f.name}
                  </span>
                  <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}
              className="text-gray-500 border-gray-200">
              Huỷ
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUpload} disabled={files.length === 0}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── SourcesPanel ──────────────────────────────────────────────────────────────

const EMPTY_SOURCES: RefDoc[] = [];

type PendingStatus = "uploading" | "done" | "failed";
interface PendingUpload { filename: string; status: PendingStatus; }

interface SourcesPanelProps {
  documentId: string;
  onSourcesChange: (ids: string[]) => void;
}

export function SourcesPanel({ documentId, onSourcesChange }: SourcesPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const isNewDoc = !documentId || documentId === "new-doc";

  const guardNewDoc = () => {
    if (isNewDoc) {
      toast({ title: "Vui lòng tạo hoặc mở văn bản trước", variant: "destructive" });
      return false;
    }
    return true;
  };

  const { data: sources = EMPTY_SOURCES } = useQuery<RefDoc[]>({
    queryKey: ["document-sources", documentId],
    queryFn: () => documentSourcesApi.list(documentId),
    enabled: !!documentId && documentId !== "new-doc",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    onSourcesChange(sources.map((s) => s.id));
  }, [sources, onSourcesChange]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["document-sources", documentId] });

  const removeMutation = useMutation({
    mutationFn: (refDocId: string) => documentSourcesApi.remove(documentId, refDocId),
    onSuccess: invalidate,
  });

  const handleStartUpload = (files: File[]) => {
    if (isNewDoc) {
      toast({ title: "Vui lòng tạo hoặc mở văn bản trước", variant: "destructive" });
      return;
    }
    // 1. Set pending items immediately
    setPendingUploads(files.map((f) => ({ filename: f.name, status: "uploading" })));

    // 2. Close modal right away
    setUploadOpen(false);

    // 3. Upload + poll in background (intentionally not awaited)
    ;(async () => {
      try {
        const batchRes = await refDocApi.uploadBatch(files, "private");
        const jobs = batchRes.jobs;
        const done = new Set<string>(); // completed job_ids

        await new Promise<void>((resolve) => {
          const check = async () => {
            const statList = await Promise.all(
              jobs.map((j) =>
                done.has(j.job_id)
                  ? Promise.resolve(null)
                  : refDocApi.getJobStatus(j.job_id).catch(() => null)
              )
            );

            statList.forEach((s, i) => {
              if (!s) return;
              if (s.status === "done" || s.status === "failed") {
                done.add(jobs[i].job_id);
                const fileStatus: PendingStatus = s.status === "done" ? "done" : "failed";
                setPendingUploads((prev) =>
                  prev.map((p) =>
                    p.filename === jobs[i].filename ? { ...p, status: fileStatus } : p
                  )
                );
                if (s.status === "done" && s.doc_id) {
                  documentSourcesApi.add(documentId, s.doc_id)
                    .then(() =>
                      queryClient.invalidateQueries({ queryKey: ["document-sources", documentId] })
                    )
                    .catch(() => {});
                }
              }
            });

            if (done.size === jobs.length) resolve();
            else setTimeout(check, 2500);
          };
          check();
        });

        // Clear pending after 2s so user sees the result
        setTimeout(() => setPendingUploads([]), 2000);
      } catch (err) {
        console.error("[handleStartUpload] failed:", err);
        setPendingUploads((prev) => prev.map((p) => ({ ...p, status: "failed" })));
        setTimeout(() => setPendingUploads([]), 3000);
      }
    })();
  };

  const handleAdded = () => {
    invalidate();
    setPickerOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-white shrink-0">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Tài liệu tham chiếu</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => guardNewDoc() && setUploadOpen(true)}
            className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            title="Upload file"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => guardNewDoc() && setPickerOpen(true)}
            className="p-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            title="Chọn từ kho"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-gray-400 px-3 pt-2 pb-1 shrink-0">
        AI chỉ tìm trong các tài liệu này
      </p>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">

        {/* Pending uploads — shown above DB sources while processing */}
        {pendingUploads.map((p) => (
          <div key={p.filename} className="flex items-center gap-2 px-3 py-2 text-sm">
            <FileText className="w-4 h-4 shrink-0 text-gray-400" />
            <span className="truncate flex-1 text-gray-500 text-xs" title={p.filename}>
              {p.filename}
            </span>
            {p.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />}
            {p.status === "done"      && <Check className="w-3 h-3 text-green-500 shrink-0" />}
            {p.status === "failed"    && <X className="w-3 h-3 text-red-500 shrink-0" />}
          </div>
        ))}

        {/* Empty state — only when nothing at all */}
        {sources.length === 0 && pendingUploads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-3 gap-2">
            <FileText className="h-8 w-8 text-gray-200" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Thêm tài liệu để AI tìm kiếm chính xác hơn
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => guardNewDoc() && setUploadOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                ↑ Upload file
              </button>
              <span className="text-xs text-gray-300">|</span>
              <button
                onClick={() => guardNewDoc() && setPickerOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                🔍 Từ kho
              </button>
            </div>
          </div>
        )}

        {/* DB sources — fully processed */}
        {sources.map((src) => (
          <div
            key={src.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 group transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate leading-tight"
                 title={src.title}>
                {src.so_ki_hieu || src.title}
              </p>
              {src.loai_van_ban && (
                <span className="inline-block text-[10px] bg-blue-100 text-blue-700 rounded px-1 mt-0.5">
                  {src.loai_van_ban}
                </span>
              )}
            </div>
            <button
              onClick={() => removeMutation.mutate(src.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <UploadSourceModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onStartUpload={handleStartUpload}
      />

      <SourcePickerModal
        open={pickerOpen}
        documentId={documentId}
        existingSourceIds={sources.map((s) => s.id)}
        onClose={() => setPickerOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}
