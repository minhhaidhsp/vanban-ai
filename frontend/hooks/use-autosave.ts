"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  onSave: () => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

export function useAutosave({
  onSave,
  interval = 30_000,
  enabled = true,
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const markDirty = useCallback(() => { isDirtyRef.current = true; }, []);

  const save = useCallback(async () => {
    if (!isDirtyRef.current || isSavingRef.current) return;
    isSavingRef.current = true;
    setStatus("saving");
    try {
      await onSaveRef.current();
      isDirtyRef.current = false;
      setLastSaved(new Date());
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [save, interval, enabled]);

  const statusLabel =
    status === "saving" ? "Đang lưu..."
    : status === "saved" && lastSaved
      ? `Đã lưu lúc ${lastSaved.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
    : status === "error" ? "Lưu thất bại, thử lại"
    : "";

  return { status, lastSaved, statusLabel, saveNow: save, markDirty };
}
