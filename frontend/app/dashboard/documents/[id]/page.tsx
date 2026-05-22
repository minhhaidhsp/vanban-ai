"use client";

import { useQuery } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(
  () => import("@/components/editor/document-editor").then((m) => m.DocumentEditor),
  { ssr: false, loading: () => (
    <div className="-m-6 h-[calc(100vh-64px)] flex items-center justify-center text-muted-foreground text-sm">
      Đang tải...
    </div>
  ) }
);

export default function EditDocumentPage({ params }: { params: { id: string } }) {
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

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col">
      <DocumentEditor
        documentId={params.id}
        initialContent={doc?.content}
        initialTitle={doc?.title}
      />
    </div>
  );
}
