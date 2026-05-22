"use client";

import dynamic from "next/dynamic";

const DocumentEditor = dynamic(
  () => import("@/components/editor/document-editor").then((m) => m.DocumentEditor),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      Đang tải...
    </div>
  ) }
);

export default function NewDocumentPage() {
  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col">
      <DocumentEditor />
    </div>
  );
}
