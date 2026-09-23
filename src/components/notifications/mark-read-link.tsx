"use client";

import { useTransition } from "react";
import Link from "next/link";

// Read state across this app is a single per-user "read up to" timestamp,
// not a per-notification flag (see AdminNotificationBell/NotificationBell) -
// so viewing any one notification marks all of them read, same as the
// explicit "Mark All as Read" button.
export function MarkReadLink({
  href,
  className,
  markAction,
  children,
}: {
  href: string;
  className?: string;
  markAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [, startTransition] = useTransition();
  return (
    <Link href={href} className={className} onClick={() => startTransition(() => void markAction())}>
      {children}
    </Link>
  );
}
