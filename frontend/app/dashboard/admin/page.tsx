"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, type UserDto } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Loader2, Trash2, UserCheck, UserPlus,
  Eye, EyeOff, RefreshCw, Copy, Check, Mail, MailX,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "staff",  label: "Cán bộ" },
  { value: "leader", label: "Lãnh đạo" },
  { value: "admin",  label: "Quản trị" },
];

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin:  "bg-red-100 text-red-700 border-red-200",
  leader: "bg-purple-100 text-purple-700 border-purple-200",
  staff:  "bg-brand-100 text-brand-700 border-brand-200",
};

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;
  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 12; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

interface CreateResult {
  plain_password: string;
  email_sent: boolean;
  email: string;
  full_name: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, isLoading: authLoading } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "staff",
    password: genPassword(),
    send_email: true,
  });
  const [showPass, setShowPass] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: userApi.listUsers,
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; is_active?: boolean } }) =>
      userApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Đã cập nhật" });
    },
    onError: () => toast({ title: "Cập nhật thất bại", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeletingId(null);
      toast({ title: "Đã xóa tài khoản" });
    },
    onError: () => {
      setDeletingId(null);
      toast({ title: "Xóa thất bại", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
      setCreateResult({
        plain_password: res.plain_password,
        email_sent: res.email_sent,
        email: form.email,
        full_name: form.full_name,
      });
      setShowResultDialog(true);
      setForm({ email: "", full_name: "", role: "staff", password: genPassword(), send_email: true });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast({
        title: "Tạo tài khoản thất bại",
        description: err?.response?.data?.detail ?? "Lỗi không xác định",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      email: form.email.trim(),
      full_name: form.full_name.trim(),
      role: form.role,
      password: form.password,
      send_email: form.send_email,
    });
  };

  const copyPassword = () => {
    if (createResult) {
      navigator.clipboard.writeText(createResult.plain_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Quản lý người dùng</h1>
            <p className="text-base text-muted-foreground">
              {users.length} tài khoản trong hệ thống
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Tạo tài khoản
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Họ tên</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Phân quyền</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Trạng thái</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-500" />
                  Đang tải...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  Chưa có tài khoản nào
                </td>
              </tr>
            ) : (
              users.map((u: UserDto) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id || updateMutation.isPending}
                      onChange={(e) =>
                        updateMutation.mutate({ id: u.id, data: { role: e.target.value } })
                      }
                      className={cn(
                        "text-sm px-2 py-1 rounded-full border font-medium",
                        "appearance-none focus:outline-none focus:ring-1 focus:ring-brand-400",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        ROLE_BADGE_CLASS[u.role] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={u.id === currentUser?.id || updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })
                      }
                      className="disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] cursor-pointer",
                          u.is_active
                            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100",
                        )}
                      >
                        {u.is_active ? "Hoạt động" : "Bị khóa"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser?.id ? (
                      <button
                        onClick={() => setDeletingId(u.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" />
                        Bạn
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Dialog: Tạo tài khoản ─────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!createMutation.isPending) setShowCreate(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-600" />
              Tạo tài khoản mới
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email *</Label>
              <Input
                id="c-email"
                type="email"
                required
                placeholder="canbo@ubnd.gov.vn"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-name">Họ và tên *</Label>
              <Input
                id="c-name"
                required
                placeholder="Nguyễn Văn A"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-role">Vai trò *</Label>
              <select
                id="c-role"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="c-pass">Mật khẩu *</Label>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, password: genPassword() }))}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tạo mới
                </button>
              </div>
              <div className="relative">
                <Input
                  id="c-pass"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Tối thiểu 8 ký tự.</p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.send_email}
                onChange={(e) => setForm((p) => ({ ...p, send_email: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm">Gửi thông tin đăng nhập qua email</span>
            </label>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Kết quả tạo tài khoản ───────────────────────────────────── */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="h-5 w-5" />
              Tạo tài khoản thành công
            </DialogTitle>
          </DialogHeader>

          {createResult && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600">
                Tài khoản cho <strong>{createResult.full_name}</strong> đã được tạo.
              </p>

              <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium">{createResult.email}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Mật khẩu</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                      {createResult.plain_password}
                    </code>
                    <button
                      onClick={copyPassword}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Sao chép mật khẩu"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-2 text-sm rounded-lg px-3 py-2",
                createResult.email_sent
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              )}>
                {createResult.email_sent
                  ? <><Mail className="h-4 w-4 shrink-0" /> Email thông tin đăng nhập đã được gửi.</>
                  : <><MailX className="h-4 w-4 shrink-0" /> Chưa gửi được email — hãy gửi mật khẩu thủ công.</>
                }
              </div>

              <p className="text-xs text-amber-600 font-medium">
                ⚠️ Lưu lại mật khẩu này ngay — hệ thống không lưu mật khẩu dạng văn bản.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)} className="bg-brand-600 hover:bg-brand-700 text-white">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tài khoản và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Xóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
