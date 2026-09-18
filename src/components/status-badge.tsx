import type { ContentStatus } from "@/lib/types/domain";

const STYLES: Record<ContentStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  archived: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
