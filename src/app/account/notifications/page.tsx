import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRegionEventsForUser } from "@/lib/queries";
import type { Profile } from "@/lib/types/domain";
import { markNotificationsRead } from "../actions";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/notifications");

  const { tab } = await searchParams;
  const activeTab = tab === "unread" || tab === "businesses" || tab === "promotions" ? tab : "all";

  const [events, { data: profile }] = await Promise.all([
    getRegionEventsForUser(user.id),
    supabase.from("profiles").select("notifications_last_read_at").eq("id", user.id).maybeSingle<Profile>(),
  ]);
  const lastRead = profile?.notifications_last_read_at ? new Date(profile.notifications_last_read_at) : null;

  const filtered = events.filter((e) => {
    if (activeTab === "unread") return !lastRead || new Date(e.created_at) > lastRead;
    if (activeTab === "businesses") return e.event_type === "new_business";
    if (activeTab === "promotions") return e.event_type === "new_offer";
    return true;
  });

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "businesses", label: "Businesses" },
    { key: "promotions", label: "Promotions" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-slate-600">
            Stay up to date with new businesses, promotions, and Passport updates.
          </p>
        </div>
        <form action={markNotificationsRead}>
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            Mark All as Read
          </button>
        </form>
      </div>

      <div className="mt-4 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/account/notifications${t.key === "all" ? "" : `?tab=${t.key}`}`}
            className={
              activeTab === t.key
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.map((e) => {
          const isUnread = !lastRead || new Date(e.created_at) > lastRead;
          return (
            <div
              key={e.id}
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                isUnread ? "border-slate-300 bg-slate-50" : "border-slate-200"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {e.event_type === "new_business" ? "New Business Added" : "New Passport Promotion"}
                </p>
                <p className="text-sm text-slate-600">
                  {e.event_type === "new_business"
                    ? `${e.businessName} has joined the Passport!`
                    : `${e.businessName} just added: ${e.offerTitle}`}
                </p>
                <p className="mt-1 text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <Link
                href={`/${e.stateSlug}/${e.areaSlug}/businesses/${e.businessSlug}`}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500"
              >
                View
              </Link>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-500">Nothing here yet.</p>}
      </div>
    </div>
  );
}
