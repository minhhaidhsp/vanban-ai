"use client";

interface SuggestDropdownProps {
  items: string[];
  onSelect: (item: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function SuggestDropdown({ items, onSelect, onClose, isOpen }: SuggestDropdownProps) {
  if (!isOpen || items.length === 0) return null;

  return (
    <>
      {/* Backdrop to close on outside click */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      {/* Dropdown list */}
      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-[100] min-w-[220px] max-h-52 overflow-y-auto">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { onSelect(item); onClose(); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 hover:text-purple-700 border-b last:border-0 transition-colors"
          >
            {item}
          </button>
        ))}
      </div>
    </>
  );
}
