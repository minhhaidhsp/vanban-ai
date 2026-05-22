"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">Không thể tải tài liệu</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
