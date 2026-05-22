"use client";

import { useState, useRef, useEffect, type CSSProperties, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { recipientApi } from "@/lib/api";

interface RecipientTagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  style?: CSSProperties;
  placeholder?: string;
}

export function RecipientTagInput({
  value,
  onChange,
  style,
  placeholder = "Nhập nơi nhận, Enter để thêm...",
}: RecipientTagInputProps) {
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions when typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputVal.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await recipientApi.search(inputVal);
        const existing = new Set(value);
        setSuggestions(results.filter((s) => !existing.has(s.name)));
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputVal, value]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addItem = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputVal("");
    setSuggestions([]);
    setShowSuggestions(false);
    recipientApi.increment(trimmed).catch(() => {});
  };

  const removeItem = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(inputVal);
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      removeItem(value.length - 1);
    }
  };

  const baseFont: CSSProperties = {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: "11pt",
    lineHeight: 1.5,
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Tags list */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          ...baseFont,
          ...style,
          cursor: "text",
          minHeight: "2em",
          borderBottom: focused ? "1.5px solid #3b82f6" : "1px solid transparent",
          paddingBottom: "2px",
        }}
      >
        {value.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "4px",
              padding: "1px 0",
            }}
          >
            <span style={baseFont}>{item}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
              className="print:hidden"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: "0 2px",
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Xóa"
            >
              <X style={{ width: "10px", height: "10px" }} />
            </button>
          </div>
        ))}

        {/* Input for new item */}
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="print:hidden"
          style={{
            ...baseFont,
            background: "transparent",
            border: "none",
            outline: "none",
            width: "100%",
            padding: 0,
            color: "inherit",
          }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="print:hidden"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 300,
            background: "white",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            minWidth: "240px",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((s) => (
            <div
              key={s.id}
              onMouseDown={() => addItem(s.name)}
              style={{
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: "11pt",
                fontFamily: "'Times New Roman', serif",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
