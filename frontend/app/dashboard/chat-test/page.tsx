"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/editor/ChatPanel";
import { useToast } from "@/hooks/use-toast";

export default function ChatTestPage() {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chat Panel Test</h1>
      <p className="text-sm text-gray-500 mb-6">
        Test SSE streaming, citations, chat history, quick chips.
      </p>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {isOpen ? "Đóng panel" : "Mở panel"}
      </button>

      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        docId="test-doc"
        getDocContext={() =>
          "Loại: CV\nTrích yếu: Về thủ tục đăng ký hộ tịch\nNội dung: Công văn đề nghị hướng dẫn thủ tục đăng ký hộ tịch cho công dân."
        }
        onInsertText={(text) => {
          toast({ title: "Insert text", description: text.slice(0, 80) + "..." });
        }}
      />
    </div>
  );
}
