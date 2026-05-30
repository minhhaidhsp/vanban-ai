"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { refDocApi, type RefDoc } from "@/lib/api";
import { RefDocTable } from "@/components/reference-docs/ref-doc-table";
import { UploadModal } from "@/components/reference-docs/upload-modal";
import { RefDocBatchUploadModal } from "@/components/reference-docs/RefDocBatchUploadModal";
import { MetadataReviewCard } from "@/components/reference-docs/MetadataReviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FolderOpen, Loader2, Upload } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

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

type TabId = "private" | "org" | "system";

const TABS: { id: TabId; label: string }[] = [
  { id: "private", label: "Của tôi" },
  { id: "org",     label: "Cơ quan" },
  { id: "system",  label: "Hệ thống" },
];

const LIMIT = 20;

export default function ReferenceDocsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("private");
  const [skip, setSkip] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [loai, setLoai] = useState<string>("");
  const [hieuLuc, setHieuLuc] = useState<string>("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RefDoc | null>(null);
  const [pendingMetadataDocId, setPendingMetadataDocId] = useState<string | null>(null);

  const q = useDebounce(searchInput, 300);

  // Fetch counts per tab for badges
  const { data: privateData } = useQuery({
    queryKey: ["reference-docs-count", "private"],
    queryFn: () => refDocApi.list({ skip: 0, limit: 1, visibility: "private" }),
  });
  const { data: orgData } = useQuery({
    queryKey: ["reference-docs-count", "org"],
    queryFn: () => refDocApi.list({ skip: 0, limit: 1, visibility: "org" }),
  });
  const { data: systemData } = useQuery({
    queryKey: ["reference-docs-count", "system"],
    queryFn: () => refDocApi.list({ skip: 0, limit: 1, visibility: "system" }),
  });

  const tabCounts: Record<TabId, number | undefined> = {
    private: privateData?.total,
    org: orgData?.total,
    system: systemData?.total,
  };

  // Main data fetch
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reference-docs", {
      skip, limit: LIMIT, visibility: activeTab,
      loai: loai || undefined, hieu_luc: hieuLuc || undefined, q: q || undefined,
      sort: sortBy, order: sortOrder,
    }],
    queryFn: () => refDocApi.list({
      skip, limit: LIMIT,
      visibility: activeTab,
      loai: loai || undefined,
      hieu_luc: hieuLuc || undefined,
      q: q || undefined,
      sort: sortBy,
      order: sortOrder,
    }),
  });

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSkip(0);
  };

  const handleFilterChange = () => setSkip(0);

  const handleEdit = (doc: RefDoc) => {
    setEditingDoc(doc);
    setSingleModalOpen(true);
  };

  const handleCloseSingle = () => {
    setSingleModalOpen(false);
    setEditingDoc(null);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Kho văn bản</h1>
          {data && (
            <span className="text-sm text-muted-foreground">({data.total})</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => setBatchModalOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload hàng loạt (AI)
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setEditingDoc(null); setSingleModalOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Nhập thủ công
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
            {tabCounts[tab.id] !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap inline-flex items-center",
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              )}>
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
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
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(col) => {
            if (col === sortBy) {
              setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
            } else {
              setSortBy(col);
              setSortOrder("desc");
            }
            setSkip(0);
          }}
        />
      )}

      {/* Batch upload modal (AI) */}
      <RefDocBatchUploadModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["reference-docs"] });
          queryClient.invalidateQueries({ queryKey: ["reference-docs-count"] });
        }}
      />

      {/* Single upload modal (manual) */}
      <UploadModal
        open={singleModalOpen}
        onClose={handleCloseSingle}
        editing={editingDoc}
        onUploaded={(id) => setPendingMetadataDocId(id)}
      />

      {/* Metadata review after single upload */}
      <MetadataReviewCard
        docId={pendingMetadataDocId}
        onClose={() => setPendingMetadataDocId(null)}
      />
    </div>
  );
}
