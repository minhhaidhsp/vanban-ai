"use client";

import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { DocumentEditor } from "@/components/editor/document-editor";

interface PageProps {
  params: { id: string };
}

export default function EditDocumentPage({ params }: PageProps) {
  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", params.id],
    queryFn: () => documentApi.get(params.id),
  });

  if (isLoading) {
    return (
      <div className="-m-6 h-[calc(100vh-64px)] flex items-center justify-center text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  let initialData = { title: doc?.title ?? "" };
  try {
    const parsed = JSON.parse(doc?.content ?? "{}");
    Object.assign(initialData, parsed);
  } catch {
    Object.assign(initialData, { section_c: doc?.content ?? "" });
  }

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col">
      <DocumentEditor documentId={params.id} initialData={initialData} />
    </div>
  );
}
