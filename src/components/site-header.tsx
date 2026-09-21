import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { signOut } from "@/app/auth/actions";
import { RegisterBusinessLink } from "@/components/register-business-link";
import { hasAnyPassport, getMyPrimaryRegion, getRegionEventsForUser, getNotificationsLastReadAt } from "@/lib/queries";
import { getAdminNotifications, getAdminNotificationsLastReadAt } from "@/lib/admin-queries";
import { getAdminScopedAreaIds } from "@/lib/admin-scope";
import { NotificationBell } from "@/components/notification-bell";
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell";
import { MobileBottomNav, type MobileBottomNavTab } from "@/components/mobile-bottom-nav";
import { MobileMenuButton } from "@/components/mobile-menu-button";
import type { State, PassportArea } from "@/lib/types/domain";

export async function SiteHeader({ region }: { region: { state: State; area: PassportArea } | null }) {
  const currentUser = await getCurrentUser();
  const isAdmin =
    !!currentUser &&
    (currentUser.isNationalAdmin || currentUser.stateAssignments.length > 0 || currentUser.areaAssignments.length > 0);
  const isCustomer = !!currentUser && !isAdmin;
  const [ownsPassport, myRegion, notificationEvents, lastReadAt] = isCustomer
    ? await Promise.all([
        hasAnyPassport(currentUser.id),
        getMyPrimaryRegion(currentUser.id),
        getRegionEventsForUser(currentUser.id),
        getNotificationsLastReadAt(currentUser.id),
      ])
    : [false, null, [], null];
  const [adminNotifications, adminLastReadAt] = isAdmin
    ? await (async () => {
        const areaIds = await getAdminScopedAreaIds(currentUser!);
        return Promise.all([getAdminNotifications(areaIds), getAdminNotificationsLastReadAt(currentUser!.id)]);
      })()
    : [[], null];

  const homeHref = region ? `/${region.state.slug}/${region.area.slug}` : "/";
  const discoverHref = region ? `/${region.state.slug}/${region.area.slug}/discover` : "/#states";
  const customerDiscoverHref = region ? discoverHref : "/account/discover";
  // The account sidebar's own "Discover" link (/account/discover) now
  // renders inline within the account layout so the sidebar stays visible -
  // but the header's own "Discover" link is the site's main navigation, not
  // part of that panel, so it should always land on the full standalone
  // page instead.
  const headerDiscoverHref = region
    ? discoverHref
    : myRegion
      ? `/${myRegion.stateSlug}/${myRegion.areaSlug}/discover`
      : "/account/discover";
  const unreadNotifications = notificationEvents.filter(
    (e) => !lastReadAt || new Date(e.created_at) > new Date(lastReadAt)
  ).length;

  const customerBottomTabs: MobileBottomNavTab[] = [
    { href: homeHref, label: "Home", icon: "home" },
    { href: customerDiscoverHref, label: "Discover", icon: "discover" },
    { href: "/account/passport", label: "Passport", icon: "passport" },
    { href: "/account", label: "Account", icon: "account" },
  ];
  const signedOutBottomTabs: MobileBottomNavTab[] = [
    { href: homeHref, label: "Home", icon: "home" },
    { href: discoverHref, label: "Discover", icon: "discover" },
    { href: "/passport", label: "Passport", icon: "passport" },
    { href: "/sign-in", label: "Login", icon: "account" },
  ];

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
                  <Link href={headerDiscoverHref} className="hover:text-slate-900">
                    Discover
                  </Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-3 text-sm font-medium">
              <NotificationBell events={notificationEvents} lastReadAt={lastReadAt} />
              <Link
                href="/account"
                className="hidden rounded-full bg-brand-primary px-4 py-2 text-white hover:bg-brand-primary-dark sm:inline-block"
              >
                {ownsPassport ? "My Passport" : "My Profile"}
              </Link>
              <form action={signOut} className="hidden sm:block">
                <button className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
                  <SignOutIcon />
                  Log Out
                </button>
              </form>
              <MobileMenuButton
                items={[
                  { href: "/account/favorites", label: "Favorites" },
                  { href: "/account/redemptions", label: "Redemption History" },
                  { href: "/account/achievements", label: "Achievements" },
                  { href: "/account/notifications", label: "Notifications", badge: unreadNotifications },
                  { href: "/account/referrals", label: "Referrals" },
                  { href: "/account/settings", label: "Settings" },
                  { href: "/faq", label: "FAQ" },
                ]}
                signOutAction={signOut}
              />
            </div>
            <MobileBottomNav tabs={customerBottomTabs} />
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
            <div className="hidden flex-wrap items-center justify-end gap-3 text-sm font-medium lg:flex">
              <Link
                href="/passport"
                className="rounded-full bg-brand-primary px-4 py-2 text-white hover:bg-brand-primary-dark"
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
            <MobileMenuButton
              items={[
                { href: "/sign-in", label: "Login", variant: "text" },
                { href: "/passport", label: "Get Your Passport", variant: "solid" },
                { href: "/create-profile", label: "Create a Profile", variant: "outline" },
                { href: discoverHref, label: "Discover", variant: "outline" },
                { href: "/faq", label: "FAQ", variant: "outline" },
              ]}
              showRegisterBusiness
              breakpoint="lg"
            />
            <MobileBottomNav tabs={signedOutBottomTabs} breakpoint="lg" />
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
