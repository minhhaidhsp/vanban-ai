"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { documentApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function NewDocumentPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    // Create a real document immediately so SourcesPanel, autosave, etc. all have a valid UUID
    documentApi.create({ title: "Văn bản mới" })
      .then((doc) => {
        router.replace(`/dashboard/documents/${doc.id}`);
      })
      .catch(() => setError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>Không thể tạo văn bản. Vui lòng thử lại.</p>
        <button
          onClick={() => router.push("/dashboard/documents")}
          className="text-teal-600 hover:underline"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
      Đang tạo văn bản mới...
    </div>
  );
}
