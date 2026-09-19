import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { signOut } from "@/app/auth/actions";
import { RegisterBusinessLink } from "@/components/register-business-link";
import { hasAnyPassport, getRegionEventsForUser, getNotificationsLastReadAt } from "@/lib/queries";
import { getAdminNotifications, getAdminNotificationsLastReadAt } from "@/lib/admin-queries";
import { getAdminScopedAreaIds } from "@/lib/admin-scope";
import { NotificationBell } from "@/components/notification-bell";
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell";
import type { State, PassportArea } from "@/lib/types/domain";

export async function SiteHeader({ region }: { region: { state: State; area: PassportArea } | null }) {
  const currentUser = await getCurrentUser();
  const isAdmin =
    !!currentUser &&
    (currentUser.isNationalAdmin || currentUser.stateAssignments.length > 0 || currentUser.areaAssignments.length > 0);
  const isCustomer = !!currentUser && !isAdmin;
  const [ownsPassport, notificationEvents, lastReadAt] = isCustomer
    ? await Promise.all([
        hasAnyPassport(currentUser.id),
        getRegionEventsForUser(currentUser.id),
        getNotificationsLastReadAt(currentUser.id),
      ])
    : [false, [], null];
  const [adminNotifications, adminLastReadAt] = isAdmin
    ? await (async () => {
        const areaIds = await getAdminScopedAreaIds(currentUser!);
        return Promise.all([getAdminNotifications(areaIds), getAdminNotificationsLastReadAt(currentUser!.id)]);
      })()
    : [[], null];

  const homeHref = region ? `/${region.state.slug}/${region.area.slug}` : "/";
  const discoverHref = region ? `/${region.state.slug}/${region.area.slug}/discover` : "/#states";

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          The Passport
        </Link>

        {isAdmin ? (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
              <Link href={homeHref} className="hover:text-slate-900">
                Home
              </Link>
              <Link
                href="/admin"
                className="rounded-full bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700"
              >
                Admin
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <AdminNotificationBell events={adminNotifications} lastReadAt={adminLastReadAt} />
              <form action={signOut}>
                <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                  <SignOutIcon />
                  Sign Out
                </button>
              </form>
            </div>
          </>
        ) : currentUser ? (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
              {region ? (
                <>
                  <Link href={homeHref} className="hover:text-slate-900">
                    Home
                  </Link>
                  <Link href={discoverHref} className="hover:text-slate-900">
                    Discover
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/#states" className="hover:text-slate-900">
                    Explore States
                  </Link>
                  <Link href="/account/discover" className="hover:text-slate-900">
                    Discover
                  </Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-3 text-sm font-medium">
              <NotificationBell events={notificationEvents} lastReadAt={lastReadAt} />
              <Link
                href="/account"
                className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
              >
                {ownsPassport ? "My Passport" : "My Profile"}
              </Link>
              <form action={signOut}>
                <button className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
                  <SignOutIcon />
                  Log Out
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
              <Link href={homeHref} className="hover:text-slate-900">
                Home
              </Link>
              <Link href={discoverHref} className="hover:text-slate-900">
                Discover
              </Link>
              <Link href="/faq" className="hover:text-slate-900">
                FAQ
              </Link>
            </nav>
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-medium">
              <Link
                href="/passport"
                className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
              >
                Get Your Passport
              </Link>
              <Link
                href="/create-profile"
                className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-500"
              >
                Create a Profile
              </Link>
              <RegisterBusinessLink className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-500" />
              <Link href="/sign-in" className="text-slate-600 hover:text-slate-900">
                Login
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M7.5 17.5H4.5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 14 17.5 10 13.5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 10H7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
