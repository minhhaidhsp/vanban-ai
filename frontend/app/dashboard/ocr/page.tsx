"use client";

import { ScanText } from "lucide-react";

export default function OcrPage() {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">OCR Văn bản</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Danh sách văn bản đã được OCR và lập chỉ mục
      </p>

      <p>Đang phát triển...</p>
    </div>
  );
}
