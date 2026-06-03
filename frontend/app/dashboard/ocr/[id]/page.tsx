"use client";

import { ScanText } from "lucide-react";

export default function OcrDetailPage() {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Xem nội dung OCR</h1>
        </div>
      </div>

      <p>Đang phát triển...</p>
    </div>
  );
}
