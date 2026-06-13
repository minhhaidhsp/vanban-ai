"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, type UserDto } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Trash2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "staff",  label: "Cán bộ" },
  { value: "leader", label: "Lãnh đạo" },
  { value: "admin",  label: "Quản trị" },
];

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin:  "bg-red-100 text-red-700 border-red-200",
  leader: "bg-purple-100 text-purple-700 border-purple-200",
  staff:  "bg-teal-100 text-teal-700 border-teal-200",
};

const ROLE_LABEL: Record<string, string> = {
  admin:  "Quản trị",
  leader: "Lãnh đạo",
  staff:  "Cán bộ",
};

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, isLoading: authLoading } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    onError: () => {
      toast({ title: "Cập nhật thất bại", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeletingId(null);
      toast({ title: "Đã xóa user" });
    },
    onError: () => {
      setDeletingId(null);
      toast({ title: "Xóa thất bại", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-50 rounded-lg">
          <Shield className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} tài khoản trong hệ thống
          </p>
        </div>
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
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-500" />
                  Đang tải...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  Chưa có user nào
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
                        "text-xs px-2 py-1 rounded-full border font-medium",
                        "appearance-none focus:outline-none focus:ring-1 focus:ring-teal-400",
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
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => setDeletingId(u.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Xóa user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
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

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa user?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. User và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Xóa user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
