"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { refDocApi, type RefDoc } from "@/lib/api";
import { RefDocTable } from "@/components/reference-docs/ref-doc-table";
import { UploadModal } from "@/components/reference-docs/upload-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FolderOpen, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const LOAI_OPTIONS = [
  "Nghị định", "Thông tư", "Quyết định", "Công văn",
  "Báo cáo", "Tờ trình", "Kế hoạch", "Hướng dẫn", "Khác",
];

const HIEU_LUC_OPTIONS = [
  { value: "chua", label: "Chưa xác định" },
  { value: "con_hieu_luc", label: "Còn hiệu lực" },
  { value: "het_hieu_luc", label: "Hết hiệu lực" },
  { value: "mot_phan", label: "Một phần" },
];

const LIMIT = 20;

export default function ReferenceDocsPage() {
  const [skip, setSkip] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [loai, setLoai] = useState<string>("");
  const [hieuLuc, setHieuLuc] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RefDoc | null>(null);

  const q = useDebounce(searchInput, 300);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reference-docs", { skip, limit: LIMIT, loai: loai || undefined, hieu_luc: hieuLuc || undefined, q: q || undefined }],
    queryFn: () =>
      refDocApi.list({
        skip,
        limit: LIMIT,
        loai: loai || undefined,
        hieu_luc: hieuLuc || undefined,
        q: q || undefined,
      }),
  });

  const handleEdit = (doc: RefDoc) => {
    setEditingDoc(doc);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDoc(null);
  };

  const handleFilterChange = () => {
    setSkip(0);
  };

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Kho văn bản</h1>
          {data && (
            <span className="text-sm text-muted-foreground">({data.total})</span>
          )}
        </div>
        <Button onClick={() => { setEditingDoc(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Thêm văn bản
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm văn bản..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); handleFilterChange(); }}
            className="pl-9"
          />
        </div>

        <Select
          value={loai || "__all__"}
          onValueChange={(v) => { setLoai(v === "__all__" ? "" : v); handleFilterChange(); }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Loại văn bản" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại</SelectItem>
            {LOAI_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={hieuLuc || "__all__"}
          onValueChange={(v) => { setHieuLuc(v === "__all__" ? "" : v); handleFilterChange(); }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Hiệu lực" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả</SelectItem>
            {HIEU_LUC_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-16 text-destructive text-sm">
          Không thể tải danh sách văn bản
        </div>
      ) : (
        <RefDocTable
          items={data?.items ?? []}
          total={data?.total ?? 0}
          skip={skip}
          limit={LIMIT}
          onPageChange={setSkip}
          onEdit={handleEdit}
        />
      )}

      {/* Modal */}
      <UploadModal
        open={modalOpen}
        onClose={handleCloseModal}
        editing={editingDoc}
      />
    </div>
  );
}
