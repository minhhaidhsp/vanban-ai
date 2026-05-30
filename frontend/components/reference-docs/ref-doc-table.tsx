"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refDocApi, type RefDoc } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Pencil, Trash2, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const HIEU_LUC_LABELS: Record<string, { label: string; className: string }> = {
  "con_hieu_luc": { label: "Còn hiệu lực", className: "bg-green-600 text-white border-green-600" },
  "het_hieu_luc": { label: "Hết hiệu lực", className: "bg-red-600 text-white border-red-600" },
  "chua":         { label: "Chưa xác định", className: "bg-gray-200 text-gray-600 border-gray-200" },
  "mot_phan":     { label: "Một phần",      className: "bg-yellow-500 text-white border-yellow-500" },
};

const VISIBILITY_LABELS: Record<string, { label: string; className: string }> = {
  "private": { label: "Riêng tư", className: "bg-gray-200 text-gray-800 border-gray-200" },
  "org":     { label: "Cơ quan",  className: "bg-blue-600 text-white border-blue-600" },
  "system":  { label: "Hệ thống", className: "bg-green-600 text-white border-green-600" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

function formatDateTime(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RefDocTableProps {
  items: RefDoc[];
  total: number;
  skip: number;
  limit: number;
  onPageChange: (skip: number) => void;
  onEdit: (doc: RefDoc) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (col: string) => void;
}

function SortIcon({ col, sortBy, sortOrder }: { col: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
  if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
  return sortOrder === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 inline text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 inline text-primary" />;
}

export function RefDocTable({ items, total, skip, limit, onPageChange, onEdit, sortBy, sortOrder, onSort }: RefDocTableProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => refDocApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-docs"] });
      toast({ title: "Đã xóa văn bản" });
    },
    onError: () => {
      toast({ title: "Xóa thất bại", variant: "destructive" });
    },
  });

  const page = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <FileText className="h-12 w-12 opacity-30" />
        <p className="text-sm">Chưa có văn bản nào</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">Số/Ký hiệu</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trích yếu</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">Loại VB</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[160px]">Cơ quan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[110px]">Ngày BH</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[140px]">Hiệu lực</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[100px] hidden sm:table-cell">Phạm vi</th>
              <th
                className="px-4 py-3 text-left font-medium text-muted-foreground w-[145px] hidden lg:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => onSort?.("created_at")}
              >
                Ngày upload
                <SortIcon col="created_at" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[100px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((doc) => {
              const hl = HIEU_LUC_LABELS[doc.hieu_luc] ?? { label: doc.hieu_luc, className: "bg-gray-200 text-gray-600 border-gray-200" };
              return (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.so_ki_hieu || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium line-clamp-2">{doc.trich_yeu}</div>
                    {doc.file_path && (
                      <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{doc.loai_van_ban}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground line-clamp-2">{doc.co_quan_ban_hanh}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(doc.ngay_ban_hanh)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs border whitespace-nowrap inline-flex items-center ${hl.className} hover:opacity-90`}>{hl.label}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {(() => {
                      const vis = VISIBILITY_LABELS[doc.visibility ?? "private"] ?? VISIBILITY_LABELS.private;
                      return (
                        <Badge className={`text-xs border whitespace-nowrap inline-flex items-center ${vis.className}`}>
                          {vis.label}
                        </Badge>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                    {formatDateTime(doc.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {doc.download_url && (
                        <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Tải xuống">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Chỉnh sửa"
                        onClick={() => onEdit(doc)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Xóa"
                        onClick={() => setDeletingId(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={limit}
        onPageChange={(p) => onPageChange((p - 1) * limit)}
        className="mt-4"
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa văn bản?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn văn bản và file đính kèm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingId) deleteMutation.mutate(deletingId);
                setDeletingId(null);
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
