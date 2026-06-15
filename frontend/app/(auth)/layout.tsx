import { ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getOrgTheme(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/v1/organizations/public-theme`, {
      cache: "no-store",
    });
    if (!res.ok) return "teal";
    const data = await res.json();
    return data.theme ?? "teal";
  } catch {
    return "teal";
  }
}

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const theme = await getOrgTheme();
  const themeClass =
    theme === "blue" ? "theme-blue" : theme === "blue-red" ? "theme-blue-red" : "";

  return <div className={themeClass || undefined}>{children}</div>;
}
