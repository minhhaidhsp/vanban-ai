"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";
import { remindersApi, UserSearchResult } from "@/lib/api/reminders";

interface Props {
  value: string[];
  onChange: (emails: string[]) => void;
  onFlushRef?: React.MutableRefObject<(() => string[]) | null>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailRecipientsInput({ value, onChange, onFlushRef }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = useCallback(
    (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;
      if (!EMAIL_RE.test(trimmed)) {
        setError(`Email không hợp lệ: ${trimmed}`);
        return;
      }
      if (value.includes(trimmed)) { setInputValue(""); return; }
      if (value.length >= 20) { setError("Tối đa 20 người nhận"); return; }
      setError("");
      onChange([...value, trimmed]);
      setInputValue("");
      setSuggestions([]);
      setShowDropdown(false);
    },
    [value, onChange]
  );

  const removeEmail = useCallback(
    (email: string) => onChange(value.filter((e) => e !== email)),
    [value, onChange]
  );

  useEffect(() => {
    if (!onFlushRef) return;
    onFlushRef.current = () => {
      const trimmed = inputValue.trim().toLowerCase();
      if (trimmed && EMAIL_RE.test(trimmed) && !value.includes(trimmed) && value.length < 20) {
        const newList = [...value, trimmed];
        onChange(newList);
        setInputValue("");
        return newList;
      }
      return [...value];
    };
  }, [inputValue, value, onChange, onFlushRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.includes(",")) {
      const parts = v.split(",");
      parts.slice(0, -1).forEach((p) => addEmail(p));
      setInputValue(parts[parts.length - 1]);
      return;
    }
    setInputValue(v);
    setError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await remindersApi.searchUsers(v.trim());
          setSuggestions(results);
          setShowDropdown(results.length > 0);
        } catch {
          setSuggestions([]);
          setShowDropdown(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const isMaxed = value.length >= 20;

  return (
    <div className="relative">
      <div
        className="flex min-h-10 flex-wrap gap-1.5 cursor-text rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {email}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeEmail(email); }}
              className="rounded-full p-0.5 text-primary/60 transition-colors hover:bg-primary/20 hover:text-primary"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {!isMaxed && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={value.length === 0 ? "email@example.com" : "Thêm người nhận..."}
            className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { addEmail(u.email); inputRef.current?.focus(); }}
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {u.full_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{u.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
      {isMaxed && (
        <p className="mt-1 text-xs text-muted-foreground">Đã đạt tối đa 20 người nhận</p>
      )}
    </div>
  );
}
