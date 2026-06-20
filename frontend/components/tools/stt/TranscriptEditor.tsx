"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Check, Trash2, CornerDownLeft } from "lucide-react";

interface Props {
  transcript: string;
  onChange: (text: string) => void;
  onInsertToEditor?: () => void;
}

export default function TranscriptEditor({
  transcript,
  onChange,
  onInsertToEditor,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isEmpty = !transcript.trim();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-medium text-foreground">
        Kết quả nhận dạng
        <span className="ml-1 font-normal text-muted-foreground">— có thể sửa trực tiếp</span>
      </Label>

      <div className="relative">
        <Textarea
          value={transcript}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Kết quả nhận dạng sẽ xuất hiện tại đây..."
          className="min-h-[140px] resize-y pr-20 text-sm leading-relaxed"
          style={{ fontSize: "14px", lineHeight: "1.7" }}
        />
        {!isEmpty && (
          <span className="absolute bottom-2.5 right-3 rounded bg-background px-1 text-xs text-muted-foreground">
            {transcript.length} ký tự
          </span>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
          disabled={isEmpty}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Xóa
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={isEmpty}
        >
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          {copied ? "Đã sao chép!" : "Sao chép"}
        </Button>
        {onInsertToEditor && (
          <Button
            type="button"
            size="sm"
            onClick={onInsertToEditor}
            disabled={isEmpty}
          >
            <CornerDownLeft className="mr-1.5 h-3.5 w-3.5" />
            Chèn vào editor
          </Button>
        )}
      </div>
    </div>
  );
}
