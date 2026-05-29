"use client";

interface SuggestButtonProps {
  isLoading: boolean;
  onClick: () => void;
  tooltip?: string;
}

export function SuggestButton({ isLoading, onClick, tooltip }: SuggestButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      title={tooltip || "Gợi ý AI"}
      className="inline-flex items-center justify-center w-6 h-6 rounded text-purple-500 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 transition-colors flex-shrink-0"
    >
      {isLoading
        ? <span className="animate-spin text-xs">⟳</span>
        : <span className="text-xs">✨</span>
      }
    </button>
  );
}
