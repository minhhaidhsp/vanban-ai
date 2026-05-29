"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi, type DocumentDto } from "@/lib/api";
import { VAN_BAN_TYPES } from "@/lib/nd30";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Plus, Trash2, Pencil, Upload, Search, File,
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { BatchUploadModal } from "./BatchUploadModal";
import { NewDocumentModal } from "./NewDocumentModal";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

const loaiFullName = (abbr: string | null | undefined): string =>
  abbr ? (VAN_BAN_TYPES[abbr]?.full_name ?? abbr) : "—";

const LOAI_OPTIONS = Object.entries(VAN_BAN_TYPES).map(([k, v]) => ({
  value: k,
  label: v.full_name,
}));

type SourceFilter = "all" | "editor" | "upload";

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loaiFilter, setLoaiFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentApi.list({ limit: 200 }),
  });

  const deleteMutation = useMutation({
    mutationFn: documentApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Đã xóa tài liệu" });
    },
  });

  // Client-side filtering + pagination
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (documents as DocumentDto[]).filter((doc) => {
      if (q && !doc.title.toLowerCase().includes(q)) return false;
      if (loaiFilter !== "all" && doc.loai_vb !== loaiFilter) return false;
      if (sourceFilter !== "all" && doc.source !== sourceFilter) return false;
      return true;
    });
  }, [documents, search, loaiFilter, sourceFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page, PAGE_SIZE]
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (fn: () => void) => { fn(); setPage(1); };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm py-8 text-center">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Action bar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Tài liệu
          <span className="ml-2 text-sm text-muted-foreground font-normal">
            ({filtered.length}{filtered.length !== documents.length ? `/${documents.length}` : ""})
          </span>
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => setBatchUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload hàng loạt
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setNewDocModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Soạn thảo mới
          </Button>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
            placeholder="Tìm theo tên..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Loại filter */}
        <Select value={loaiFilter} onValueChange={(v) => handleFilterChange(() => setLoaiFilter(v))}>
          <SelectTrigger className="h-8 text-sm w-[160px]">
            <SelectValue placeholder="Loại văn bản" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {LOAI_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source toggle */}
        <div className="flex rounded-md border overflow-hidden h-8 text-sm">
          {(["all", "editor", "upload"] as SourceFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(() => setSourceFilter(s))}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                sourceFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-white hover:bg-gray-50 text-gray-600"
              )}
            >
              {s === "all" ? "Tất cả" : s === "editor" ? "Soạn thảo" : "Upload"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          {documents.length === 0 ? (
            <>
              <p className="text-muted-foreground text-sm">Chưa có tài liệu nào</p>
              <Link href="/dashboard/documents/new">
                <Button variant="outline" className="mt-4" size="sm">
                  Soạn thảo văn bản đầu tiên
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Không tìm thấy tài liệu phù hợp</p>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-full">
                  Tên văn bản
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                  Loại
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                  Nguồn
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
                  Ngày tạo
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagedItems.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Tên */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="flex items-center gap-2 min-w-0 group/link"
                    >
                      {doc.source === "upload"
                        ? <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <FileText className="h-4 w-4 text-primary shrink-0" />
                      }
                      <span className="truncate font-medium group-hover/link:text-primary transition-colors max-w-[280px] sm:max-w-none">
                        {doc.title}
                      </span>
                    </Link>
                  </td>

                  {/* Loại */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {doc.loai_vb ? (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {loaiFullName(doc.loai_vb)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>

                  {/* Nguồn */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {doc.source === "editor" ? (
                      <Badge className="text-xs bg-teal-600 text-white border-teal-600 hover:bg-teal-600">
                        Soạn thảo
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-gray-600 text-white border-gray-600 hover:bg-gray-600">
                        Upload
                      </Badge>
                    )}
                  </td>

                  {/* Ngày tạo */}
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden md:table-cell">
                    {new Date(doc.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                  </td>

                  {/* Thao tác */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Link href={`/dashboard/documents/${doc.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <BatchUploadModal
        open={batchUploadOpen}
        onClose={() => setBatchUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] });
          toast({ title: "Upload hoàn thành", description: "Danh sách đã được cập nhật." });
        }}
      />

      <NewDocumentModal
        open={newDocModalOpen}
        onClose={() => {
          setNewDocModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["documents"] });
        }}
      />
    </div>
  );
}
