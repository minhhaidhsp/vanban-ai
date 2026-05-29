import { DocumentList } from "@/components/dashboard/document-list";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tài liệu của tôi</h1>
        <p className="text-muted-foreground text-sm">Quản lý văn bản soạn thảo và tài liệu đã upload</p>
      </div>
      <DocumentList />
    </div>
  );
}
