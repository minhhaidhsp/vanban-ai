"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  url: string;
  className?: string;
}

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);

  // workerSrc must be set client-side only — pdfjs-dist breaks in Node.js SSR
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }, []);

  return (
    <div className={`flex flex-col border rounded-lg bg-white overflow-hidden ${className ?? ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-sm shrink-0">
        <span className="text-muted-foreground text-xs">
          {numPages > 0 ? `${numPages} trang` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={scale <= 0.5}
            onClick={() => setScale((s) => +(Math.max(0.5, s - 0.2)).toFixed(1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-muted-foreground w-12 text-center text-xs">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={scale >= 2.0}
            onClick={() => setScale((s) => +(Math.min(2.0, s + 0.2)).toFixed(1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF content — scrolls internally */}
      <div
        className="flex-1 overflow-y-auto overflow-x-auto bg-gray-100 flex flex-col items-center p-4"
        style={{ minHeight: 0 }}
      >
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <span>Đang tải PDF...</span>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-red-500">
              <span>Không thể tải PDF</span>
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="mb-2">
              <Page
                pageNumber={i + 1}
                scale={scale}
                className="shadow-md"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
