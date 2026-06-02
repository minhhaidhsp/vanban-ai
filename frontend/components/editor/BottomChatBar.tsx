"use client"
import { useState } from "react"
import { Plus, Sliders, ArrowUp, Sparkles } from "lucide-react"

interface BottomChatBarProps {
  onSend: (message: string) => void
  onToggleSidePanel: () => void
  sidePanelOpen: boolean
}

export function BottomChatBar({ onSend, onToggleSidePanel, sidePanelOpen }: BottomChatBarProps) {
  const [input, setInput] = useState("")

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center pb-4 px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-lg px-3 py-2">
          {/* Left buttons */}
          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <Plus size={18} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <Sliders size={18} />
          </button>

          {/* Input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && input.trim()) {
                onSend(input.trim())
                setInput("")
              }
            }}
            placeholder="Hỏi AI hoặc mô tả yêu cầu..."
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />

          {/* Right buttons */}
          <button
            onClick={onToggleSidePanel}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              sidePanelOpen
                ? "bg-blue-100 text-blue-600"
                : "hover:bg-gray-100 text-gray-500"
            }`}
            title="Switch to side panel"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Panel</span>
          </button>

          <button
            onClick={() => { if (input.trim()) { onSend(input.trim()); setInput("") } }}
            disabled={!input.trim()}
            className="p-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 rounded-lg text-white transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
