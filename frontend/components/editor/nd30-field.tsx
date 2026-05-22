"use client";

import { useState, useRef, useEffect, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Nd30FieldProps {
  value: string;
  onChange: (val: string) => void;
  style?: CSSProperties;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  /** Ẩn placeholder khi không focus (dùng cho các ô luôn hiển thị) */
  alwaysShow?: boolean;
}

/**
 * Ô thể thức click-to-edit.
 * Bình thường hiển thị styled text; click → input/textarea.
 */
export function Nd30Field({
  value,
  onChange,
  style,
  placeholder = "Click để nhập...",
  multiline = false,
  className,
  alwaysShow = false,
}: Nd30FieldProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const sharedStyle: CSSProperties = {
    fontFamily: "'Times New Roman', Times, serif",
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    padding: 0,
    margin: 0,
    width: "100%",
    lineHeight: 1.5,
    ...style,
  };

  if (editing) {
    const editStyle: CSSProperties = {
      ...sharedStyle,
      borderBottom: "1.5px solid #3b82f6",
    };

    if (multiline) {
      const lines = (value.match(/\n/g) ?? []).length + 1;
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          rows={Math.max(lines, 2)}
          style={editStyle}
          className={cn("block", className)}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); setEditing(false); }
        }}
        style={editStyle}
        className={cn("block", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{ ...style, cursor: "text", minHeight: "1.4em", lineHeight: 1.5 }}
      className={cn("relative select-none", className)}
      title="Click để chỉnh sửa"
    >
      {value || (
        <span style={{
          color: "#9ca3af",
          fontWeight: "normal",
          fontStyle: "italic",
          textTransform: "none",
          textDecoration: "none",
        }}>
          {placeholder}
        </span>
      )}
    </div>
  );
}
