import type { LucideIcon } from "lucide-react";

interface Props {
  Icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoonPlaceholder({ Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-2xl bg-teal-50 p-6 mb-6">
        <Icon className="h-14 w-14 text-teal-300" />
      </div>
      <h1 className="text-xl font-semibold text-slate-800 mb-2">{title}</h1>
      <p className="text-sm font-medium text-teal-600 mb-3">Tính năng đang được phát triển</p>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}
