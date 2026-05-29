"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { documentApi } from "@/lib/api";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface NewDocumentModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewDocumentModal({ open, onClose }: NewDocumentModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const doc = await documentApi.create({ title: "Văn bản mới" });
        onClose();
        router.push(`/dashboard/documents/${doc.id}?new=true`);
      } catch (err) {
        console.error("[NewDocumentModal] create failed:", err);
        onClose();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-700">Đang tạo văn bản...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
