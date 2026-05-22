"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 30_000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const dataRef = useRef(data);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
    isDirtyRef.current = true;
  }, [data]);

  const save = useCallback(async () => {
    if (!isDirtyRef.current || isSavingRef.current) return;
    isSavingRef.current = true;
    setStatus("saving");
    try {
      await onSave(dataRef.current);
      isDirtyRef.current = false;
      setLastSaved(new Date());
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [save, interval, enabled]);

  const statusLabel =
    status === "saving" ? "Đang lưu..."
    : status === "saved" && lastSaved
      ? `Đã lưu lúc ${lastSaved.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
    : status === "error" ? "Lưu thất bại"
    : "";

  return { status, lastSaved, statusLabel, saveNow: save };
}
