"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export function DocumentList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
        <Link href="/dashboard/documents/new">
          <Button>
            <Plus className="h-4 w-4" />
            Soạn thảo mới
          </Button>
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chưa có tài liệu nào</p>
          <Link href="/dashboard/documents/new">
            <Button variant="outline" className="mt-4">
              Soạn thảo văn bản đầu tiên
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(documents as unknown as { id: string; title: string; content?: string; created_at: string }[]).map((doc) => (
            <div key={doc.id} className="rounded-lg border bg-card p-4 space-y-3 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center gap-2 min-w-0 flex-1 group"
                >
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {doc.title}
                  </span>
                </Link>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/dashboard/documents/${doc.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </Link>
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
              <p className="text-xs text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString("vi-VN", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
