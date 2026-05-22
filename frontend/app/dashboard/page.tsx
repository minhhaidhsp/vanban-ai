import { DocumentList } from "@/components/dashboard/document-list";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tài liệu của tôi</h1>
        <p className="text-muted-foreground">Quản lý và phân tích văn bản của bạn</p>
      </div>
      <DocumentList />
    </div>
  );
}
