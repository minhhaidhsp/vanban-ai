"use client";

import { useState, useRef, useEffect } from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Undo, Redo, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Arial",           value: "Arial" },
  { label: "Cambria",         value: "Cambria" },
  { label: "Calibri",         value: "Calibri" },
  { label: "Georgia",         value: "Georgia" },
  { label: "Verdana",         value: "Verdana" },
  { label: "Courier New",     value: "Courier New" },
  { label: "Helvetica",       value: "Helvetica" },
];

const LINE_SPACINGS = [
  { label: "Đơn (1.0)",    value: "1" },
  { label: "1.15",         value: "1.15" },
  { label: "Đơn rưỡi",    value: "1.5" },
  { label: "Đôi (2.0)",   value: "2" },
];

const PARA_SPACE = "12pt";

// ── Sub-components ────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, active, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-7 w-7 inline-flex items-center justify-center rounded text-sm transition-colors",
        "hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed",
        active && "bg-muted text-primary font-medium"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-border mx-0.5" />;
}

// ── Paragraph format dropdown ─────────────────────────────────────────────────

function ParagraphDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const curLineHeight =
    editor.getAttributes("paragraph").lineHeight ||
    editor.getAttributes("heading").lineHeight ||
    "1.5";
  const hasSpaceBefore = !!editor.getAttributes("paragraph").marginTop;
  const hasSpaceAfter  = !!editor.getAttributes("paragraph").marginBottom;

  const setLineHeight = (lh: string) => {
    editor.chain().focus()
      .updateAttributes("paragraph", { lineHeight: lh })
      .updateAttributes("heading",   { lineHeight: lh })
      .run();
    setOpen(false);
  };

  const toggleSpaceBefore = () => {
    editor.chain().focus()
      .updateAttributes("paragraph", { marginTop: hasSpaceBefore ? null : PARA_SPACE })
      .run();
  };

  const toggleSpaceAfter = () => {
    editor.chain().focus()
      .updateAttributes("paragraph", { marginBottom: hasSpaceAfter ? null : PARA_SPACE })
      .run();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Khoảng cách dòng và đoạn"
        className="h-7 inline-flex items-center gap-0.5 px-1.5 rounded text-xs hover:bg-muted transition-colors"
      >
        <span className="text-[11px] font-mono">{curLineHeight}↕</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[210px]">
          {LINE_SPACINGS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLineHeight(value)}
              className="flex items-center gap-3 px-4 py-1.5 text-sm hover:bg-gray-100 w-full text-left"
            >
              <span className={curLineHeight === value ? "opacity-100" : "opacity-0"}>✓</span>
              {label}
            </button>
          ))}

          <div className="border-t border-gray-100 my-1" />

          <button
            type="button"
            onClick={toggleSpaceBefore}
            className="flex items-center gap-3 px-4 py-1.5 text-sm hover:bg-gray-100 w-full text-left"
          >
            <span className={hasSpaceBefore ? "opacity-100" : "opacity-0"}>✓</span>
            Thêm khoảng trước đoạn
          </button>
          <button
            type="button"
            onClick={toggleSpaceAfter}
            className="flex items-center gap-3 px-4 py-1.5 text-sm hover:bg-gray-100 w-full text-left"
          >
            <span className={hasSpaceAfter ? "opacity-100" : "opacity-0"}>✓</span>
            Thêm khoảng sau đoạn
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────────

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const hasTextStyle = !!editor.schema.marks["textStyle"];

  // Current font family (strip quotes added by browser CSS parser)
  const currentFont = hasTextStyle
    ? (editor.getAttributes("textStyle").fontFamily || "").replace(/['"]/g, "")
    : "";

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Hoàn tác"
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Làm lại"
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Font family */}
      {hasTextStyle && (
        <select
          value={currentFont}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          className="h-7 text-xs border border-gray-200 rounded px-1 bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring max-w-[130px]"
          title="Kiểu chữ"
        >
          <option value="">— Kiểu chữ —</option>
          {FONT_FAMILIES.map(({ label, value }) => (
            <option key={value} value={value} style={{ fontFamily: value }}>
              {label}
            </option>
          ))}
        </select>
      )}

      {/* Font size */}
      {hasTextStyle && (
        <select
          value={(() => {
            const style = editor.getAttributes("textStyle").fontSize;
            return style ? parseInt(style) : 13;
          })()}
          onChange={(e) => {
            editor.chain().focus()
              .setMark("textStyle", { fontSize: `${e.target.value}pt` })
              .run();
          }}
          className="h-7 text-xs border border-gray-200 rounded px-1 bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring w-[58px]"
          title="Cỡ chữ"
        >
          {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36].map((s) => (
            <option key={s} value={s}>{s}pt</option>
          ))}
        </select>
      )}

      <Divider />

      {/* Bold / Italic / Underline / Strike / Highlight */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="In đậm (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="In nghiêng (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Gạch chân (Ctrl+U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Gạch ngang"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="Tô sáng"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Align */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Căn trái"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Căn giữa"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Căn phải"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Căn đều"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Danh sách chấm"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Danh sách số"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Paragraph format (line spacing + space before/after) */}
      <ParagraphDropdown editor={editor} />

    </div>
  );
}
