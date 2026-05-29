"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { documentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, X, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type JobStatus = "pending" | "processing" | "done" | "failed";

interface Job {
  job_id: string;
  filename: string;
  status: JobStatus;
  error: string | null;
}

interface BatchUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ACCEPT = ".pdf,.doc,.docx,.txt";
const MAX_FILES = 20;
const POLL_INTERVAL_MS = 3000;

export function BatchUploadModal({ open, onClose, onSuccess }: BatchUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback((initialJobs: Job[]) => {
    stopPolling();
    const ids = initialJobs.map((j) => j.job_id);

    pollRef.current = setInterval(async () => {
      const results = await Promise.all(
        ids.map((id) => documentApi.getJobStatus(id).catch(() => null))
      );

      setJobs((prev) => {
        const next = prev.map((j, i) => {
          const upd = results[i];
          if (!upd) return j;
          return { ...j, status: upd.status, error: upd.error };
        });

        const allSettled = next.every(
          (j) => j.status === "done" || j.status === "failed"
        );
        if (allSettled) {
          stopPolling();
          onSuccess?.();
        }
        return next;
      });
    }, POLL_INTERVAL_MS);
  }, [onSuccess]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      stopPolling();
      setSelectedFiles([]);
      setJobs([]);
      setUploadError(null);
      setIsUploading(false);
    }
    return stopPolling;
  }, [open]);

  const addFiles = (incoming: File[]) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...incoming];
      return combined.slice(0, MAX_FILES);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeFile = (index: number) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await documentApi.uploadBatch(selectedFiles);
      const initialJobs: Job[] = res.jobs.map((j) => ({
        job_id: j.job_id,
        filename: j.filename,
        status: "pending",
        error: null,
      }));
      setSelectedFiles([]);
      setJobs(initialJobs);
      startPolling(initialJobs);
    } catch {
      setUploadError("Upload thất bại — vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const allSettled =
    jobs.length > 0 && jobs.every((j) => j.status === "done" || j.status === "failed");

  const statusIcon = (s: JobStatus) => {
    if (s === "done") return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
    if (s === "failed") return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
    return <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />;
  };

  const statusLabel: Record<JobStatus, string> = {
    pending: "Đang chờ...",
    processing: "Đang xử lý...",
    done: "Hoàn thành",
    failed: "Thất bại",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isUploading) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload nhiều văn bản</DialogTitle>
        </DialogHeader>

        {/* ── Phase 1: file selection ────────────────────────────── */}
        {jobs.length === 0 && (
          <>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-primary/50"
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
                accept={ACCEPT}
                multiple
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <p className="text-sm">
                  Kéo thả hoặc nhấn để chọn file
                  {selectedFiles.length > 0 && ` (${selectedFiles.length}/${MAX_FILES})`}
                </p>
                <p className="text-xs">PDF, Word, TXT — tối đa {MAX_FILES} file</p>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {selectedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded border text-sm"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Hủy
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFiles.length || isUploading}
              >
                {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Upload{selectedFiles.length > 0 ? ` ${selectedFiles.length} file` : ""}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Phase 2: job status polling ────────────────────────── */}
        {jobs.length > 0 && (
          <>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {jobs.map((job) => (
                <div
                  key={job.job_id}
                  className="flex items-start gap-3 p-3 rounded-lg border text-sm"
                >
                  {statusIcon(job.status)}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{job.filename}</p>
                    {job.status === "failed" && job.error && (
                      <p className="text-xs text-destructive mt-0.5">{job.error}</p>
                    )}
                    {(job.status === "pending" || job.status === "processing") && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusLabel[job.status]}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      job.status === "done" && "text-green-600",
                      job.status === "failed" && "text-destructive",
                      (job.status === "pending" || job.status === "processing") &&
                        "text-muted-foreground"
                    )}
                  >
                    {statusLabel[job.status]}
                  </span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={onClose} disabled={!allSettled}>
                {allSettled ? "Đóng" : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Đang xử lý...
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
