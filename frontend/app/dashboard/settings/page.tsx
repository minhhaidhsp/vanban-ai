"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: organizationApi.getCurrent,
  });

  // ── Org info form ─────────────────────────────────────────────────────────
  const [orgForm, setOrgForm] = useState({
    ten_chu_quan: "",
    ten_co_quan: "",
    viet_tat: "",
    dia_danh: "",
  });

  // ── Signature form ────────────────────────────────────────────────────────
  const [sigForm, setSigForm] = useState({
    quyen_han: "",
    ten_tap_the: "",
    chuc_vu: "",
  });

  useEffect(() => {
    if (org) {
      setOrgForm({
        ten_chu_quan: org.ten_chu_quan ?? "",
        ten_co_quan:  org.ten_co_quan  ?? "",
        viet_tat:     org.viet_tat     ?? "",
        dia_danh:     org.dia_danh     ?? "",
      });
      setSigForm({
        quyen_han:   org.chu_ky_mac_dinh?.quyen_han   ?? "",
        ten_tap_the: org.chu_ky_mac_dinh?.ten_tap_the ?? "",
        chuc_vu:     org.chu_ky_mac_dinh?.chuc_vu     ?? "",
      });
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

  const handleSigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrg.mutate({
      chu_ky_mac_dinh: {
        quyen_han:   sigForm.quyen_han,
        ten_tap_the: sigForm.ten_tap_the,
        chuc_vu:     sigForm.chuc_vu,
      },
    });
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
        <p className="text-muted-foreground text-sm mt-0.5">
          Cấu hình thông tin đơn vị và mẫu văn bản
        </p>
      </div>

      {/* ── Section 1: Thông tin đơn vị ──────────────────────────────── */}
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
              <p className="text-xs text-muted-foreground">Dùng trong số ký hiệu</p>
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Section 2: Chữ ký mặc định ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Chữ ký mặc định</CardTitle>
          <CardDescription>
            Tự động điền vào phần ký tên văn bản
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSigSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quyen_han">Quyền hạn ký</Label>
              <Input
                id="quyen_han"
                value={sigForm.quyen_han}
                onChange={(e) => setSigForm((p) => ({ ...p, quyen_han: e.target.value }))}
                placeholder="TM. ỦY BAN NHÂN DÂN"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ten_tap_the">Tên tập thể</Label>
              <Input
                id="ten_tap_the"
                value={sigForm.ten_tap_the}
                onChange={(e) => setSigForm((p) => ({ ...p, ten_tap_the: e.target.value }))}
                placeholder="CHỦ TỊCH"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chuc_vu">Chức vụ ký</Label>
              <Input
                id="chuc_vu"
                value={sigForm.chuc_vu}
                onChange={(e) => setSigForm((p) => ({ ...p, chuc_vu: e.target.value }))}
                placeholder="Chủ tịch UBND phường"
              />
            </div>
            <Button
              type="submit"
              disabled={updateOrg.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
