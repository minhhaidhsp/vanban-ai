import { Mic } from "lucide-react";
import { ComingSoonPlaceholder } from "@/components/dashboard/ComingSoonPlaceholder";

export default function SpeechToTextPage() {
  return (
    <ComingSoonPlaceholder
      Icon={Mic}
      title="Chuyển âm thanh thành văn bản"
      description="Ghi âm hoặc tải file âm thanh, hệ thống sẽ tự động chuyển thành văn bản để chỉnh sửa."
    />
  );
}
