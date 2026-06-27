"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/Pagination";
import { hoSoApi, type HoSoListItem, type HoSoStats } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

const TABS = [
  { label: "Tất cả",       value: "" },
  { label: "Đang xử lý",   value: "dang_xu_ly" },
  { label: "Chờ bổ sung",  value: "cho_bo_sung" },
  { label: "Hoàn thành",   value: "hoan_thanh" },
];

const LOAI_OPTIONS = [
  "Đăng ký thành lập hộ kinh doanh",
  "Đăng ký thay đổi nội dung đăng ký hộ kinh doanh",
  "Chấm dứt hoạt động hộ kinh doanh",
  "Đăng ký khai sinh",
  "Đăng ký kết hôn",
  "Đăng ký khai tử",
  "Cấp giấy xác nhận thường trú",
  "Cấp phép xây dựng",
  "Thủ tục hành chính khác",
];

const BADGE: Record<string, { label: string; className: string }> = {
  moi:         { label: "Mới",          className: "bg-gray-100 text-gray-700" },
  dang_xu_ly:  { label: "Đang xử lý",  className: "bg-blue-100 text-blue-700" },
  cho_bo_sung: { label: "Chờ bổ sung", className: "bg-amber-100 text-amber-700" },
  hoan_thanh:  { label: "Hoàn thành",  className: "bg-green-100 text-green-700" },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];
type SortKey = "ma_ho_so" | "ten_chu_ho_so" | "trang_thai" | "han_xu_ly";

function SortIcon({ col, sortKey, sortOrder }: { col: SortKey; sortKey: SortKey; sortOrder: "asc" | "desc" }) {
  if (sortKey !== col) return <ChevronUp className="h-3 w-3 ml-1 inline opacity-30" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1 inline text-primary" />
    : <ChevronDown className="h-3 w-3 ml-1 inline text-primary" />;
}

export default function HoSoListPage() {
  const router = useRouter();

  const [tab, setTab] = useState("");
  const [items, setItems] = useState<HoSoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HoSoStats | null>(null);

  // Filter state
  const [q, setQ] = useState("");
  const [filterLoai, setFilterLoai] = useState("");

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("ma_ho_so");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch stats once on mount
  useEffect(() => {
    hoSoApi.stats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    hoSoApi.list(tab || undefined)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { setPage(1); }, [q, filterLoai, sortKey, sortOrder, pageSize]);

  const badge = (trang_thai: string) => {
    const b = BADGE[trang_thai] ?? { label: trang_thai, className: "bg-gray-100 text-gray-700" };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${b.className}`}>
        {b.label}
      </span>
    );
  };

  const filtered = useMemo(() => {
    let res = [...items];
    if (q.trim()) {
      const lower = q.toLowerCase();
      res = res.filter((i) =>
        i.ma_ho_so.toLowerCase().includes(lower) ||
        i.ten_chu_ho_so.toLowerCase().includes(lower)
      );
    }
    if (filterLoai) {
      res = res.filter((i) => i.loai_thu_tuc === filterLoai);
    }
    return res;
  }, [items, q, filterLoai]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "han_xu_ly") {
        const av = a.han_xu_ly;
        const bv = b.han_xu_ly;
        if (!av && !bv) return 0;
        if (!av) return sortOrder === "asc" ? 1 : -1;
        if (!bv) return sortOrder === "asc" ? -1 : 1;
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = a[sortKey] as string;
      const bv = b[sortKey] as string;
      return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const hasFilter = q.trim() !== "" || filterLoai !== "";

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("asc"); }
  };

  const clearFilters = () => { setQ(""); setFilterLoai(""); };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hồ sơ hành chính</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý hồ sơ thủ tục hành chính công dân
          </p>
        </div>
        <Button className="gap-2" onClick={() => router.push("/dashboard/ho-so/new")}>
          <Plus className="h-4 w-4" />
          Tạo hồ sơ mới
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(
          [
            { label: "Tổng hồ sơ",     key: "tong",                color: "text-foreground" },
            { label: "Đang xử lý",      key: "dang_xu_ly",          color: "text-blue-600" },
            { label: "Chờ bổ sung",     key: "cho_bo_sung",         color: "text-amber-600" },
            { label: "Hoàn thành",      key: "hoan_thanh",          color: "text-emerald-600" },
            { label: "Quá hạn",         key: "qua_han",             color: "text-destructive" },
            { label: "HT tháng này",    key: "hoan_thanh_thang_nay",color: "text-primary" },
          ] as const
        ).map(({ label, key, color }) => (
          <div key={key} className="rounded-md border bg-card px-3 py-2 text-center">
            {stats ? (
              <p className={cn("text-xl font-bold leading-none", color, stats[key] === 0 && key === "qua_han" ? "text-muted-foreground" : "")}>
                {stats[key]}
              </p>
            ) : (
              <div className="h-6 w-10 mx-auto bg-muted animate-pulse rounded" />
            )}
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm mã hồ sơ, tên công dân..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterLoai || "__all__"}
          onValueChange={(v) => setFilterLoai(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Loại thủ tục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại thủ tục</SelectItem>
            {LOAI_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[130px] cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("ma_ho_so")}
              >
                Mã hồ sơ <SortIcon col="ma_ho_so" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("ten_chu_ho_so")}
              >
                Tên công dân <SortIcon col="ten_chu_ho_so" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[200px]">
                Loại thủ tục
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[140px] cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("trang_thai")}
              >
                Trạng thái <SortIcon col="trang_thai" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[120px] cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("han_xu_ly")}
              >
                Hạn xử lý <SortIcon col="han_xu_ly" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-[80px]">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Đang tải...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FolderOpen className="h-10 w-10 opacity-30" />
                    {hasFilter ? (
                      <>
                        <p className="text-sm">Không tìm thấy hồ sơ phù hợp</p>
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Xóa bộ lọc
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">Chưa có hồ sơ nào</p>
                        <Button
                          size="sm"
                          onClick={() => router.push("/dashboard/ho-so/new")}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Tạo hồ sơ mới
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/ho-so/${item.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary whitespace-nowrap">
                    {item.ma_ho_so}
                  </td>
                  <td className="px-4 py-3 font-medium truncate max-w-0">
                    {item.ten_chu_ho_so}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">
                    {item.loai_thu_tuc}
                  </td>
                  <td className="px-4 py-3">{badge(item.trang_thai)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {item.han_xu_ly ? fmtDate(item.han_xu_ly) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/ho-so/${item.id}`);
                      }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: page size + pagination */}
      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Hiển thị</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>hàng/trang</span>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={sorted.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
