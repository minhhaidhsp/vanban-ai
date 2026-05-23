"use client";

import { DocumentPreview } from "@/components/editor/DocumentPreview";
import type { Nd30Data } from "@/lib/nd30";

export function PrintPreview({ data }: { data: Nd30Data }) {
  return <DocumentPreview data={data} onClose={() => {}} />;
}
