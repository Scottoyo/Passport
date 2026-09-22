import type { ContentStatus } from "@/lib/types/domain";

const STYLES: Record<ContentStatus, string> = {
  draft: "bg-surface-elevated text-ink-muted",
  active: "bg-success-bg text-success",
  paused: "bg-warning-bg text-warning",
  archived: "bg-error-bg text-error",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
