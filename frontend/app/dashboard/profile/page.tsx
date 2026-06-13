"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: userApi.getMe,
  });

  // ── Profile form ─────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  useEffect(() => {
    if (user) setFullName(user.full_name);
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () => userApi.updateProfile({ full_name: fullName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Đã lưu thông tin" });
    },
    onError: () => toast({ title: "Lưu thất bại", variant: "destructive" }),
  });

  // ── Password form ─────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const changePassword = useMutation({
    mutationFn: () =>
      userApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      }),
    onSuccess: () => {
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      toast({ title: "Đổi mật khẩu thành công" });
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Đổi mật khẩu thất bại", variant: "destructive" }),
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast({ title: "Mật khẩu xác nhận không khớp", variant: "destructive" });
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast({ title: "Mật khẩu mới tối thiểu 8 ký tự", variant: "destructive" });
      return;
    }
    changePassword.mutate();
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
        <h1 className="text-2xl font-bold tracking-tight">Tài khoản</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Quản lý thông tin cá nhân và bảo mật
        </p>
      </div>

      {/* ── Section 1: Thông tin cá nhân ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl select-none">
              {user ? getInitials(user.full_name) : "?"}
            </div>
            <div>
              <p className="font-medium text-sm">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Họ tên</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email ?? ""}
                disabled
                className="text-muted-foreground"
              />
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending || fullName === user?.full_name}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Section 2: Đổi mật khẩu ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
              <Input
                id="current_password"
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_password">Mật khẩu mới</Label>
              <Input
                id="new_password"
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">Tối thiểu 8 ký tự</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirm_password"
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={changePassword.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
