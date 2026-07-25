"use client";

/**
 * Dashboard cá nhân — Hồ sơ hành chính
 * MOCKUP với data tĩnh — chưa kết nối API
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock, AlertTriangle, Calendar, Bell, ChevronRight,
  TrendingUp, TrendingDown, CheckCircle2, FolderOpen,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";

// ── Màu sắc chuẩn ───────────────────────────────────────────────────────────

const C = {
  blue:   "#3b82f6",
  green:  "#00c48c",
  amber:  "#f59e0b",
  red:    "#f43f5e",
  purple: "#a855f7",
  cyan:   "#06b6d4",
  gray:   "#94a3b8",
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const DONUT_DATA = [
  { name: "Hoàn thành",   value: 32, color: C.green  },
  { name: "Đang xử lý",   value: 8,  color: C.blue   },
  { name: "Chờ bổ sung",  value: 3,  color: C.amber  },
  { name: "Quá hạn",      value: 1,  color: C.red    },
];

const LINE_MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6"];
const LINE_DATA = LINE_MONTHS.map((month, i) => ({
  month,
  canBo:    [8, 7, 6.5, 5.8, 5.2, 4.8][i],
  mucTieu:  5,
  tbPhong:  [7, 6.8, 6.5, 6.2, 6, 5.8][i],
}));

const HBAR_DATA = [
  { name: "Đăng ký HKD",       value: 18 },
  { name: "Thay đổi HKD",      value: 8  },
  { name: "Cấp lại GCN",       value: 4  },
  { name: "Tạm ngừng HKD",     value: 2  },
];

const TODAY_ITEMS = [
  { icon: "alert",    type: "den_han",   badge: "Đến hạn",  color: C.red,    text: "HS-2026-003 — Nguyễn Văn Bình",    time: "Hết hạn hôm nay" },
  { icon: "alert",    type: "den_han",   badge: "Đến hạn",  color: C.red,    text: "HS-2026-007 — Trần Thị Hoa",       time: "Hết hạn hôm nay" },
  { icon: "clock",    type: "sap_han",   badge: "Sắp hạn",  color: C.amber,  text: "HS-2026-011 — Lê Minh Đức",        time: "Còn 2 ngày"     },
  { icon: "calendar", type: "hop",       badge: "Họp",      color: C.blue,   text: "Giao ban tổ chức một cửa",          time: "14:00"          },
  { icon: "bell",     type: "nhac",      badge: "Nhắc",     color: C.purple, text: "Nộp báo cáo tháng 6",              time: "Cuối ngày"      },
];

const ACTIVITY_FEED = [
  { time: "09:32", icon: "check",  text: "Hoàn thành bước 3 — HS-2026-013", sub: "Soạn thảo GCN" },
  { time: "08:55", icon: "upload", text: "Upload hồ sơ gốc — HS-2026-014",  sub: "2 tài liệu" },
  { time: "08:20", icon: "create", text: "Tạo hồ sơ mới — HS-2026-015",     sub: "Đăng ký HKD" },
  { time: "Hôm qua", icon: "done", text: "Hoàn thành — HS-2026-010",        sub: "Đăng ký HKD" },
  { time: "Hôm qua", icon: "note", text: "Yêu cầu bổ sung — HS-2026-009",   sub: "Thiếu CCCD công chứng" },
];

const QUICK_STATS = [
  { label: "Hồ sơ tạo tháng này", value: "15",  delta: "+3 so với T5", up: true  },
  { label: "Thời gian TB",         value: "4.8 ngày", delta: "-0.4 so với T5", up: true  },
  { label: "Tỷ lệ hoàn thành",    value: "72%", delta: "-8% so với T5", up: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayLabel(): string {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

function ItemIcon({ icon }: { icon: string }) {
  const cls = "h-4 w-4 shrink-0";
  if (icon === "alert")    return <AlertTriangle className={`${cls} text-red-500`} />;
  if (icon === "clock")    return <Clock className={`${cls} text-amber-500`} />;
  if (icon === "calendar") return <Calendar className={`${cls} text-blue-500`} />;
  if (icon === "bell")     return <Bell className={`${cls} text-purple-500`} />;
  if (icon === "check")    return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (icon === "done")     return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (icon === "upload")   return <FolderOpen className={`${cls} text-blue-500`} />;
  if (icon === "create")   return <FolderOpen className={`${cls} text-cyan-500`} />;
  return <Bell className={`${cls} text-muted-foreground`} />;
}

// ── Custom Tooltip recharts ───────────────────────────────────────────────────

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value} ngày</p>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════

export default function HoSoStatsPage() {
  const daysLeft  = daysLeftInMonth();
  const target    = 50;
  const done      = 32;
  const pct       = Math.round((done / target) * 100);
  const projected = 41;  // mock dự báo
  const needPerDay = daysLeft > 0 ? ((target - done) / daysLeft).toFixed(1) : "—";
  const donutTotal = DONUT_DATA.reduce((s, d) => s + d.value, 0);

  const projColor = projected / target >= 1 ? C.green
    : projected / target >= 0.7 ? C.amber : C.red;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thống kê cá nhân</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hiệu suất xử lý hồ sơ của bạn — tháng này
          </p>
        </div>
        <Link href="/dashboard/ho-so">
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            Xem tất cả hồ sơ <ChevronRight className="h-4 w-4" />
          </button>
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          1. KPI cá nhân — full width
      ══════════════════════════════════════════════════════════════ */}
      <Card className="border-l-4" style={{ borderLeftColor: C.blue }}>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Left: progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Mục tiêu tháng: <span className="text-foreground font-semibold">{done}/{target} hồ sơ</span>
                </p>
                <span className="ml-auto text-2xl font-bold text-primary">{pct}%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #3b82f6, #00c48c)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>{target} hồ sơ</span>
              </div>
            </div>

            {/* Right: forecast */}
            <div className="lg:w-72 rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dự báo</p>
              <p className="text-sm font-medium" style={{ color: projColor }}>
                Với tốc độ hiện tại, dự kiến đạt{" "}
                <span className="font-bold">{projected}/{target}</span> hồ sơ cuối tháng
                {projected < target && " ⚠️"}
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Còn <strong>{daysLeft} ngày</strong> trong tháng</p>
                <p>Cần xử lý thêm <strong>{needPerDay} hồ sơ/ngày</strong> để đạt mục tiêu</p>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
            {QUICK_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xs mt-0.5 flex items-center justify-center gap-0.5 ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {s.delta}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          Row 2: Donut (1/2) + Lịch (1/2)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 2. Donut hồ sơ theo trạng thái */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hồ sơ của tôi theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={DONUT_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {DONUT_DATA.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [v, "hồ sơ"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold">{donutTotal}</span>
                  <span className="text-xs text-muted-foreground">hồ sơ</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2.5">
                {DONUT_DATA.map((d) => (
                  <div key={d.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-sm text-muted-foreground truncate">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Lịch & nhắc việc hôm nay */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Hôm nay — {todayLabel()}</span>
              <Link href="/dashboard/ho-so">
                <button className="text-xs text-primary hover:underline font-normal">
                  Xem tất cả
                </button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {TODAY_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-muted/40">
                <ItemIcon icon={item.icon} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                      style={{ background: item.color }}
                    >
                      {item.badge}
                    </span>
                    <span className="text-sm font-medium truncate">{item.text}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Row 3: Line chart (2/3) + Horizontal bar (1/3)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 4. Hiệu suất xử lý — line chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Thời gian xử lý TB (ngày)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={LINE_DATA} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" ngày" domain={[0, 10]} width={56} />
                <Tooltip content={<LineTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line
                  name="Của tôi"
                  type="monotone"
                  dataKey="canBo"
                  stroke={C.purple}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: C.purple }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  name="Mục tiêu"
                  type="monotone"
                  dataKey="mucTieu"
                  stroke={C.red}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                />
                <Line
                  name="TB phòng"
                  type="monotone"
                  dataKey="tbPhong"
                  stroke={C.gray}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Xu hướng tốt — thời gian xử lý giảm đều 6 tháng liên tiếp
            </p>
          </CardContent>
        </Card>

        {/* 5. Phân loại hồ sơ — horizontal bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Phân loại hồ sơ đã xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-1">
              {HBAR_DATA.map((d) => {
                const maxVal = HBAR_DATA[0].value;
                const widthPct = (d.value / maxVal) * 100;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground truncate pr-2">{d.name}</span>
                      <span className="font-semibold tabular-nums shrink-0">{d.value}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${widthPct}%`,
                          background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Tổng <strong>32 hồ sơ</strong> đã hoàn thành tháng này
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          6. Thông báo & hoạt động gần đây — full width, 2 cột
      ══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 divide-y lg:divide-y-0">
            {/* Cột trái: activity feed */}
            <div className="space-y-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 mb-0">
                Hoạt động
              </p>
              {ACTIVITY_FEED.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                  <div className="mt-0.5">
                    <ItemIcon icon={a.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{a.time}</span>
                </div>
              ))}
            </div>

            {/* Cột phải: thông báo chưa đọc */}
            <div className="pt-4 lg:pt-0 lg:pl-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2">
                Thông báo chưa đọc
                <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-white text-[9px] font-bold">9</span>
              </p>
              <div className="space-y-0">
                {[
                  { loai: "tao_moi",       tieu_de: "Hồ sơ mới — HS-2026-013",           time: "vừa xong",    color: C.blue   },
                  { loai: "buoc_hoan_thanh", tieu_de: "Bước 1 hoàn thành — HS-2026-013", time: "vừa xong",    color: C.green  },
                  { loai: "tao_moi",       tieu_de: "Hồ sơ mới — HS-2026-012",           time: "4 phút trước", color: C.blue  },
                  { loai: "cho_bo_sung",   tieu_de: "Cần bổ sung — HS-2026-009",          time: "2 giờ trước", color: C.amber  },
                  { loai: "hoan_thanh",    tieu_de: "Hoàn thành — HS-2026-008",           time: "hôm qua",     color: C.green  },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                    <span
                      className="mt-1 h-2 w-2 rounded-full shrink-0"
                      style={{ background: n.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.tieu_de}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {n.loai === "tao_moi" ? "Hồ sơ mới"
                          : n.loai === "buoc_hoan_thanh" ? "Bước hoàn thành"
                          : n.loai === "cho_bo_sung" ? "Chờ bổ sung"
                          : "Hoàn thành"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{n.time}</span>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full text-xs text-primary hover:underline text-center">
                Xem tất cả thông báo →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mock badge */}
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="text-muted-foreground text-xs">
          🔧 MOCKUP — Data tĩnh, chưa kết nối API
        </Badge>
      </div>
    </div>
  );
}
