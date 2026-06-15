import { BellRing } from "lucide-react";
import { ComingSoonPlaceholder } from "@/components/dashboard/ComingSoonPlaceholder";

export default function RemindersPage() {
  return (
    <ComingSoonPlaceholder
      Icon={BellRing}
      title="Đặt lịch nhắc hẹn"
      description="Đặt lịch nhắc các công việc, hạn xử lý hồ sơ để không bỏ sót nhiệm vụ."
    />
  );
}
