"use client";

interface Props {
  value: string;
  onChange: (code: string) => void;
}

const LANGUAGES = [
  { code: "vi", label: "🇻🇳 Tiếng Việt" },
  { code: "en", label: "🇺🇸 English" },
];

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex gap-1 rounded-full border bg-muted p-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChange(lang.code)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
            value === lang.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
