"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const THEME_CLASSES = ["theme-blue", "theme-blue-red", "theme-red", "theme-teal"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: org, isLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/v1/organizations/public-theme`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));

    if (isLoading) {
      // Khi đang load — apply red mặc định
      root.classList.add("theme-red");
      return;
    }

    const theme = (org as any)?.theme ?? "red";

    if (theme === "blue")          root.classList.add("theme-blue");
    else if (theme === "blue-red") root.classList.add("theme-blue-red");
    else if (theme === "red")      root.classList.add("theme-red");
    else if (theme === "teal")     root.classList.add("theme-teal");

  }, [org?.theme, isLoading]);

  return <>{children}</>;
}
