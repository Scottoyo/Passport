"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { markNotificationsRead } from "@/app/account/actions";

export interface NotificationBellEvent {
  id: string;
  event_type: "new_business" | "new_offer";
  created_at: string;
  businessName: string;
  businessSlug: string;
  areaSlug: string;
  stateSlug: string;
  offerTitle: string | null;
}

export function NotificationBell({
  events,
  lastReadAt,
}: {
  events: NotificationBellEvent[];
  lastReadAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [locallyRead, setLocallyRead] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const lastRead = lastReadAt ? new Date(lastReadAt) : null;
  const isUnread = (createdAt: string) => !locallyRead && (!lastRead || new Date(createdAt) > lastRead);
  const unreadCount = locallyRead ? 0 : events.filter((e) => isUnread(e.created_at)).length;
  const recent = events.slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleMarkAllRead() {
    setLocallyRead(true);
    startTransition(async () => {
      await markNotificationsRead();
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted hover:text-ink"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-surface shadow-xl">
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="p-4 text-sm text-ink-muted">Nothing here yet.</p>
            ) : (
              recent.map((e) => (
                <Link
                  key={e.id}
                  href={`/${e.stateSlug}/${e.areaSlug}/businesses/${e.businessSlug}`}
                  onClick={() => {
                    setOpen(false);
                    handleMarkAllRead();
                  }}
                  className={`block border-b border-border p-3 text-sm hover:bg-surface-elevated ${
                    isUnread(e.created_at) ? "bg-surface-elevated" : ""
                  }`}
                >
                  <p className="font-semibold text-ink">
                    {e.event_type === "new_business" ? "New Business Added" : "New Passport Promotion"}
                  </p>
                  <p className="text-ink-muted">
                    {e.event_type === "new_business"
                      ? `${e.businessName} has joined the Passport!`
                      : `${e.businessName} just added: ${e.offerTitle}`}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{new Date(e.created_at).toLocaleDateString()}</p>
                </Link>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border p-3">
            <button
              type="button"
              disabled={isPending || unreadCount === 0}
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-40"
            >
              Mark All as Read
            </button>
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-ink-muted hover:text-ink"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden>
      <path
        d="M4.5 8a5.5 5.5 0 1 1 11 0c0 3.5 1.25 4.5 1.25 5.25H3.25C3.25 12.5 4.5 11.5 4.5 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.25 15.75a1.75 1.75 0 0 0 3.5 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
