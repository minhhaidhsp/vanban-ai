"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationApi, userApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  {
    id: "teal",
    label: "Xanh ngọc",
    sublabel: "Mặc định",
    swatches: ["#f0fdfa", "#2dd4bf", "#0d9488", "#115e59"],
  },
  {
    id: "blue",
    label: "Xanh dương",
    sublabel: "",
    swatches: ["#e6f1fb", "#378add", "#0c447c", "#08305a"],
  },
  {
    id: "blue-red",
    label: "Xanh dương & Đỏ",
    sublabel: "",
    swatches: ["#e6f1fb", "#378add", "#0c447c", "#e24b4a"],
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: organizationApi.getCurrent,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: userApi.getMe,
  });

  const isAdmin = me?.role === "admin";

  const [orgForm, setOrgForm] = useState({
    ten_chu_quan: "",
    ten_co_quan: "",
    viet_tat: "",
    dia_danh: "",
  });

  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("teal");

  useEffect(() => {
    if (org) {
      setOrgForm({
        ten_chu_quan: org.ten_chu_quan ?? "",
        ten_co_quan:  org.ten_co_quan  ?? "",
        viet_tat:     org.viet_tat     ?? "",
        dia_danh:     org.dia_danh     ?? "",
      });
      setSelectedTheme((org.theme as ThemeId) ?? "teal");
    }
  }, [org]);

  const updateOrg = useMutation({
    mutationFn: (payload: Parameters<typeof organizationApi.updateCurrent>[0]) =>
      organizationApi.updateCurrent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast({ title: "Đã lưu cài đặt" });
    },
    onError: () => toast({ title: "Lưu thất bại", variant: "destructive" }),
  });

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrg.mutate(orgForm);
  };

  const handleThemeSelect = (themeId: ThemeId) => {
    if (themeId === selectedTheme) return;
    setSelectedTheme(themeId);
    updateOrg.mutate(
      { theme: themeId },
      {
        onSuccess: () => {
          toast({ title: "Đã áp dụng giao diện mới" });
          window.location.reload();
        },
        onError: () => {
          setSelectedTheme((org?.theme as ThemeId) ?? "teal");
          toast({ title: "Lưu thất bại", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground text-base mt-0.5">
          Cấu hình thông tin đơn vị và giao diện
        </p>
      </div>

      {/* ── Thông tin đơn vị ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin đơn vị</CardTitle>
          <CardDescription>
            Thông tin này được tự động điền vào văn bản khi soạn thảo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOrgSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ten_chu_quan">Tên chủ quản</Label>
              <Input
                id="ten_chu_quan"
                value={orgForm.ten_chu_quan}
                onChange={(e) => setOrgForm((p) => ({ ...p, ten_chu_quan: e.target.value }))}
                placeholder="UBND THÀNH PHỐ HỒ CHÍ MINH"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ten_co_quan">Tên cơ quan ban hành</Label>
              <Input
                id="ten_co_quan"
                value={orgForm.ten_co_quan}
                onChange={(e) => setOrgForm((p) => ({ ...p, ten_co_quan: e.target.value }))}
                placeholder="UBND PHƯỜNG NHIÊU LỘC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="viet_tat">Viết tắt</Label>
              <Input
                id="viet_tat"
                value={orgForm.viet_tat}
                onChange={(e) => setOrgForm((p) => ({ ...p, viet_tat: e.target.value }))}
                placeholder="UBND"
              />
              <p className="text-sm text-muted-foreground">Dùng trong số ký hiệu</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dia_danh">Địa danh</Label>
              <Input
                id="dia_danh"
                value={orgForm.dia_danh}
                onChange={(e) => setOrgForm((p) => ({ ...p, dia_danh: e.target.value }))}
                placeholder="TP. Hồ Chí Minh"
              />
            </div>
            <Button
              type="submit"
              disabled={updateOrg.isPending}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Giao diện (chỉ admin) ───────────────────────────── */}
      {isAdmin && <Card>
        <CardHeader>
          <CardTitle>Giao diện</CardTitle>
          <CardDescription>
            Màu chủ đạo của hệ thống — áp dụng cho toàn bộ giao diện
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  disabled={updateOrg.isPending}
                  className={cn(
                    "relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 text-center transition-all",
                    isActive
                      ? "border-brand-600 bg-brand-50 shadow-sm"
                      : "border-border bg-card hover:border-brand-200 hover:bg-muted/30"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  {/* Swatch preview */}
                  <div className="flex gap-1">
                    {theme.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-base font-medium leading-tight">{theme.label}</p>
                    {theme.sublabel && (
                      <p className="text-sm text-muted-foreground mt-0.5">{theme.sublabel}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
