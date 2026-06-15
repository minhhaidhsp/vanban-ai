"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { organizationApi } from "@/lib/api";

const THEME_CLASSES = ["theme-blue", "theme-blue-red"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: organizationApi.getCurrent,
    staleTime: Infinity,
  });

  useEffect(() => {
    const theme = org?.theme ?? "teal";
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));
    if (theme === "blue") root.classList.add("theme-blue");
    if (theme === "blue-red") root.classList.add("theme-blue-red");
  }, [org?.theme]);

  return <>{children}</>;
}
