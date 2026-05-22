"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { DocumentDialog } from "@/components/dashboard/document-dialog";
import { useToast } from "@/hooks/use-toast";

export function DocumentList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<{ id: string; title: string; content?: string } | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: documentApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Đã xóa tài liệu" });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditDoc(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Tạo tài liệu
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chưa có tài liệu nào</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
            Tạo tài liệu đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc: { id: string; title: string; content?: string; created_at: string }) => (
            <div key={doc.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm truncate">{doc.title}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditDoc(doc); setDialogOpen(true); }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-destructive"
                    onClick={() => deleteMutation.mutate(doc.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {doc.content && (
                <p className="text-xs text-muted-foreground line-clamp-2">{doc.content}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString("vi-VN")}
              </p>
            </div>
          ))}
        </div>
      )}

      <DocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        document={editDoc}
      />
    </div>
  );
}
