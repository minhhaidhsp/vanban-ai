"use client";

import "./editor.css";
import { useState, useCallback } from "react";
import { RichEditor } from "./rich-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { documentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Save, Check, AlertCircle, Loader2 } from "lucide-react";

export interface DocumentSections {
  title: string;
  section_a: string;
  section_b: string;
  section_c: string;
}

interface DocumentEditorProps {
  documentId?: string;
  initialData?: Partial<DocumentSections>;
  onSaved?: (id: string) => void;
}

function SectionLabel({
  tag,
  label,
  description,
}: {
  tag: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
        {tag}
      </span>
      <div>
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">{description}</span>
      </div>
    </div>
  );
}

function SaveIndicator({ status, label }: { status: string; label: string }) {
  if (!label) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "saved" && <Check className="h-3 w-3 text-green-500" />}
      {status === "error" && <AlertCircle className="h-3 w-3 text-destructive" />}
      {label}
    </span>
  );
}

export function DocumentEditor({
  documentId,
  initialData,
  onSaved,
}: DocumentEditorProps) {
  const [docId, setDocId] = useState(documentId);
  const [sections, setSections] = useState<DocumentSections>({
    title: initialData?.title ?? "",
    section_a: initialData?.section_a ?? "",
    section_b: initialData?.section_b ?? "",
    section_c: initialData?.section_c ?? "",
  });

  const handleSave = useCallback(
    async (data: DocumentSections) => {
      const payload = {
        title: data.title || "Tài liệu không tiêu đề",
        content: JSON.stringify({
          section_a: data.section_a,
          section_b: data.section_b,
          section_c: data.section_c,
        }),
      };

      if (docId) {
        await documentApi.update(docId, payload);
      } else {
        const created = await documentApi.create(payload);
        setDocId(created.id);
        onSaved?.(created.id);
      }
    },
    [docId, onSaved]
  );

  const { status, statusLabel, saveNow } = useAutosave({
    data: sections,
    onSave: handleSave,
    interval: 30_000,
    enabled: sections.title.length > 0 || sections.section_c.length > 0,
  });

  const update = (key: keyof DocumentSections) => (value: string) =>
    setSections((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-card">
        <Input
          value={sections.title}
          onChange={(e) => update("title")(e.target.value)}
          placeholder="Tiêu đề văn bản..."
          className="border-0 shadow-none text-lg font-semibold px-0 focus-visible:ring-0 placeholder:font-normal placeholder:text-base"
        />
        <div className="flex items-center gap-3 shrink-0">
          <SaveIndicator status={status} label={statusLabel} />
          <Button size="sm" onClick={saveNow} disabled={status === "saving"}>
            {status === "saving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Lưu
          </Button>
        </div>
      </div>

      {/* 3 sections */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Section A */}
        <section>
          <SectionLabel
            tag="A"
            label="Thể thức"
            description="Tiêu ngữ, quốc hiệu, số hiệu, ngày tháng, cơ quan ban hành"
          />
          <RichEditor
            content={sections.section_a}
            onChange={update("section_a")}
            placeholder="Nhập thể thức văn bản (tiêu ngữ, số hiệu, ngày tháng...)"
            minHeight="100px"
            showToolbar
          />
        </section>

        {/* Section B */}
        <section>
          <SectionLabel
            tag="B"
            label="Căn cứ"
            description="Cơ sở pháp lý, văn bản tham chiếu"
          />
          <RichEditor
            content={sections.section_b}
            onChange={update("section_b")}
            placeholder="Nhập căn cứ ban hành (Căn cứ Luật..., Căn cứ Nghị định...)"
            minHeight="100px"
            showToolbar
          />
        </section>

        {/* Section C */}
        <section>
          <SectionLabel
            tag="C"
            label="Nội dung"
            description="Phần chính của văn bản"
          />
          <RichEditor
            content={sections.section_c}
            onChange={update("section_c")}
            placeholder="Nhập nội dung chính của văn bản..."
            minHeight="320px"
            showToolbar
            showWordCount
          />
        </section>
      </div>
    </div>
  );
}
