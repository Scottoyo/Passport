import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { hasAnyPassport, getMyPrimaryRegion, getRegionEventsForUser, getNotificationsLastReadAt } from "@/lib/queries";
import { getAdminNotifications, getAdminNotificationsLastReadAt } from "@/lib/admin-queries";
import { getAdminScopedAreaIds } from "@/lib/admin-scope";
import { SiteHeaderNav } from "@/components/site-header-nav";

export async function SiteHeader() {
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

  return (
    <header data-site-header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          The Passport
        </Link>
        <SiteHeaderNav
          isAdmin={isAdmin}
          isCustomer={isCustomer}
          ownsPassport={ownsPassport}
          myRegion={myRegion}
          notificationEvents={notificationEvents}
          lastReadAt={lastReadAt}
          adminNotifications={adminNotifications}
          adminLastReadAt={adminLastReadAt}
        />
      </div>
    </header>
  );
}
