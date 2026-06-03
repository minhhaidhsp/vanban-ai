"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { refDocApi, type RefDoc } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScanText, Download, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

export default function OcrPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["reference-docs-ocr"],
    queryFn: () => refDocApi.list({ limit: 100 }),
  });

  const indexed = (data?.items ?? []).filter((doc) => (doc.chunk_count ?? 0) > 0);

  const handleExport = async (doc: RefDoc, format: "docx" | "pdf") => {
    try {
      const response = await refDocApi.exportFile(doc.id, format);
      const url = URL.createObjectURL(response.data as Blob);
      const rawName = doc.so_ki_hieu || doc.title || doc.id;
      const safeName = rawName.replace(/[/\\:*?"<>|]/g, "_").substring(0, 120);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Xuất file thất bại", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">OCR Văn bản</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Danh sách văn bản đã được OCR và lập chỉ mục ({indexed.length} văn bản)
      </p>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : indexed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <ScanText className="h-12 w-12 opacity-20" />
          <p className="text-sm">Chưa có văn bản nào được lập chỉ mục.</p>
          <p className="text-xs">
            Hãy upload văn bản tại{" "}
            <Link href="/dashboard/reference-docs" className="text-primary underline underline-offset-2">
              Kho văn bản tham chiếu
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên văn bản</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">Loại VB</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[160px]">Số ký hiệu</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">Ngày upload</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[110px]">Số chunk</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[150px]">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {indexed.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{doc.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{doc.loai_van_ban || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{doc.so_ki_hieu || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                      {doc.chunk_count} chunks
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/ocr/${doc.id}`}>Xem</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport(doc, "docx")}>
                            Tải xuống Word
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(doc, "pdf")}>
                            Tải xuống PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
