import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRegionEventsForUser } from "@/lib/queries";
import type { Profile } from "@/lib/types/domain";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const [{ data: profile }, events] = await Promise.all([
    supabase
      .from("profiles")
      .select("notifications_last_read_at")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
    getRegionEventsForUser(user.id),
  ]);

  const lastRead = profile?.notifications_last_read_at ? new Date(profile.notifications_last_read_at) : null;
  const unreadCount = events.filter((e) => !lastRead || new Date(e.created_at) > lastRead).length;

  const nav = [
    { href: "/account", label: "Dashboard" },
    { href: "/account/passport", label: "My Passport" },
    { href: "/account/discover", label: "Discover" },
    { href: "/account/favorites", label: "Favorites" },
    { href: "/account/redemptions", label: "Redemption History" },
    { href: "/account/achievements", label: "Achievements" },
    { href: "/account/notifications", label: "Notifications", badge: unreadCount },
    { href: "/account/referrals", label: "Referrals" },
    { href: "/account/settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <aside className="md:w-56 md:shrink-0">
          <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted md:mb-4 md:block">
            My Account
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-2 text-sm md:block md:space-y-1 md:overflow-visible md:pb-0">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-full border border-border px-4 py-2 font-medium text-ink hover:bg-surface-elevated md:rounded-lg md:border-0 md:px-3 md:py-2"
              >
                {item.label}
                {"badge" in item && item.badge! > 0 && (
                  <span className="rounded-full bg-error px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
