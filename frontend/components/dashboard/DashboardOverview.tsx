"use client";

import { useQuery } from "@tanstack/react-query";
import { documentApi, type DocumentDto, type DocumentStats } from "@/lib/api";
import { VAN_BAN_TYPES } from "@/lib/nd30";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Upload, CalendarDays, LayoutDashboard,
  TrendingUp, File,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d === 1) return "hôm qua";
  if (d < 7) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const loaiLabel = (abbr: string) => VAN_BAN_TYPES[abbr]?.full_name ?? abbr;

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  sublabel?: string;
  iconBg?: string;
}

function MetricCard({ label, value, icon, sublabel, iconBg = "bg-primary/10" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value.toLocaleString("vi-VN")}</p>
            {sublabel && (
              <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart colors ──────────────────────────────────────────────────────────────

const BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#7c3aed", "#4f46e5", "#3b82f6", "#06b6d4",
  "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

const PIE_COLORS = { editor: "#0d9488", upload: "#94a3b8" };

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery<DocumentStats>({
    queryKey: ["document-stats"],
    queryFn: documentApi.getStats,
  });

  const { data: recentDocs = [], isLoading: recentLoading } = useQuery<DocumentDto[]>({
    queryKey: ["documents-recent"],
    queryFn: () => documentApi.list({ limit: 5, sort: "updated_at" }),
  });

  // Prepare chart data
  const barData = stats
    ? Object.entries(stats.by_type)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ name: loaiLabel(key), abbr: key, count }))
    : [];

  const pieData = stats
    ? [
        { name: "Soạn thảo", value: stats.editor_count, color: PIE_COLORS.editor },
        { name: "Upload", value: stats.upload_count, color: PIE_COLORS.upload },
      ].filter((d) => d.value > 0)
    : [];

  const hasData = stats && stats.total > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground text-sm">Thống kê tài liệu của bạn</p>
      </div>

      {/* ── Row 1: Metric cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Tổng tài liệu"
              value={stats?.total ?? 0}
              icon={<LayoutDashboard className="h-5 w-5 text-primary" />}
              sublabel="Tất cả loại"
              iconBg="bg-primary/10"
            />
            <MetricCard
              label="Văn bản soạn thảo"
              value={stats?.editor_count ?? 0}
              icon={<FileText className="h-5 w-5 text-teal-600" />}
              sublabel="Soạn trên hệ thống"
              iconBg="bg-teal-50"
            />
            <MetricCard
              label="File đã upload"
              value={stats?.upload_count ?? 0}
              icon={<Upload className="h-5 w-5 text-slate-500" />}
              sublabel="Kho tài liệu"
              iconBg="bg-slate-100"
            />
            <MetricCard
              label="7 ngày qua"
              value={stats?.recent_7_days ?? 0}
              icon={<CalendarDays className="h-5 w-5 text-violet-600" />}
              sublabel="Văn bản mới"
              iconBg="bg-violet-50"
            />
          </>
        )}
      </div>

      {/* ── Row 2: Charts ───────────────────────────────────── */}
      {!statsLoading && !hasData ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">Chưa có dữ liệu thống kê</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Bắt đầu soạn thảo hoặc upload văn bản để xem biểu đồ phân tích tại đây.
            </p>
            <Link href="/dashboard/documents/new">
              <button className="mt-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                Soạn văn bản đầu tiên
              </button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* BarChart: by_type (3/5 width) */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phân loại văn bản</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : barData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  Chưa có văn bản có phân loại
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis
                      dataKey="abbr"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: ValueType | undefined) => [v ?? 0, "Văn bản"]}
                      labelFormatter={(l) => loaiLabel(String(l ?? ""))}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* PieChart: editor vs upload (2/5 width) */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nguồn tài liệu</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : pieData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 12 }}>{value}</span>
                      )}
                    />
                    <Tooltip
                      formatter={(v: ValueType | undefined) => [v ?? 0, "Văn bản"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Row 3: Hoạt động gần đây ───────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Hoạt động gần đây
            <Link
              href="/dashboard/documents"
              className="text-xs text-primary font-normal hover:underline"
            >
              Xem tất cả →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          ) : recentDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có hoạt động nào
            </p>
          ) : (
            recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/dashboard/documents/${doc.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors group"
              >
                <div className="rounded-md bg-muted p-1.5 shrink-0">
                  {doc.source === "upload"
                    ? <File className="h-4 w-4 text-muted-foreground" />
                    : <FileText className="h-4 w-4 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {doc.loai_vb && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 whitespace-nowrap inline-flex items-center">
                        {loaiLabel(doc.loai_vb)}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {doc.source === "editor" ? "Soạn thảo" : "Upload"}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {relativeTime(doc.updated_at)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
