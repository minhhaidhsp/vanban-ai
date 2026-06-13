"use client";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "leader" | "staff";
  is_active: boolean;
  is_superuser: boolean;
}

export function useCurrentUser() {
  const { data: user, isLoading } = useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin  = user?.role === "admin" || user?.is_superuser === true;
  const isLeader = user?.role === "leader" || isAdmin;
  const isStaff  = true;

  return { user, isLoading, isAdmin, isLeader, isStaff };
}
