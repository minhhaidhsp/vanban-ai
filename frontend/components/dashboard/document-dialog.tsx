"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  title: z.string().min(1, "Vui lòng nhập tiêu đề"),
  content: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: { id: string; title: string; content?: string } | null;
}

export function DocumentDialog({ open, onOpenChange, document }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!document;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ title: document?.title ?? "", content: document?.content ?? "" });
    }
  }, [open, document, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? documentApi.update(document!.id, data) : documentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: isEdit ? "Đã cập nhật tài liệu" : "Đã tạo tài liệu mới" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Có lỗi xảy ra", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa tài liệu" : "Tạo tài liệu mới"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input id="title" {...register("title")} placeholder="Nhập tiêu đề..." />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Nội dung</Label>
            <textarea
              id="content"
              {...register("content")}
              placeholder="Nhập nội dung văn bản..."
              rows={6}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
