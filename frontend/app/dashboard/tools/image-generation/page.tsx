import { ImagePlus } from "lucide-react";
import { ComingSoonPlaceholder } from "@/components/dashboard/ComingSoonPlaceholder";

export default function ImageGenerationPage() {
  return (
    <ComingSoonPlaceholder
      Icon={ImagePlus}
      title="Tạo hình ảnh"
      description="Tạo hình ảnh minh họa cho văn bản, báo cáo bằng AI theo mô tả của bạn."
    />
  );
}
