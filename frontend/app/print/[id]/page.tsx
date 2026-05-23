import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PrintPreview } from "./PrintPreview";
import type { Nd30Data } from "@/lib/nd30";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchDocument(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/v1/documents/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function PrintPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) notFound();

  const doc = await fetchDocument(params.id, token);
  if (!doc) notFound();

  let nd30Data: Nd30Data;
  try {
    nd30Data = typeof doc.content === "string" ? JSON.parse(doc.content) : doc.content;
  } catch {
    notFound();
  }

  return <PrintPreview data={nd30Data} />;
}
