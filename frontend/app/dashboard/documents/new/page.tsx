"use client";

import { useRouter } from "next/navigation";
import { DocumentEditor } from "@/components/editor/document-editor";

export default function NewDocumentPage() {
  const router = useRouter();

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col">
      <DocumentEditor
        onSaved={(id) => {
          router.replace(`/dashboard/documents/${id}`);
        }}
      />
    </div>
  );
}
