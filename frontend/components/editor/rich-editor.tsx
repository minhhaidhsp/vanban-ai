"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { sharedExtensions } from "./extensions";
import { EditorToolbar } from "./editor-toolbar";
import { cn } from "@/lib/utils";

interface RichEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showToolbar?: boolean;
  showWordCount?: boolean;
}

export function RichEditor({
  content = "",
  onChange,
  placeholder = "Nhập nội dung...",
  className,
  minHeight = "120px",
  showToolbar = true,
  showWordCount = false,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      ...sharedExtensions,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      {showToolbar && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      {showWordCount && editor && (
        <div className="px-3 py-1.5 border-t text-xs text-muted-foreground text-right">
          {editor.storage.characterCount.words()} từ ·{" "}
          {editor.storage.characterCount.characters()} ký tự
        </div>
      )}
    </div>
  );
}
