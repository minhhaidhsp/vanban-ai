"use client";

import { useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  url: string;
  className?: string;
}

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // workerSrc must be set client-side only — pdfjs-dist breaks in Node.js SSR
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
    },
    [],
  );

  return (
    <div className={`flex flex-col border rounded-lg bg-white overflow-hidden ${className ?? ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 text-sm">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-muted-foreground">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={scale <= 0.5}
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={scale >= 2.0}
            onClick={() => setScale((s) => Math.min(2.0, +(s + 0.2).toFixed(1)))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF content */}
      <div
        className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4"
        style={{ minHeight: "500px" }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
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
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-md"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );
}
