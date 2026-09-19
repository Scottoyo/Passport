import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getAdminScopedAreaIds } from "@/lib/admin-scope";
import { getAdminNotifications, getAdminNotificationsLastReadAt, type AdminNotificationWithDetails } from "@/lib/admin-queries";
import { markAdminNotificationsRead } from "../notifications-actions";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

function describe(n: AdminNotificationWithDetails): { label: string; detail: string; href: string } {
  if (n.notification_type === "business_pending_review") {
    return {
      label: "Business Pending Approval",
      detail: `${n.businessName ?? "A business"} in ${n.areaName} is waiting for review.`,
      href: n.business_id ? `/admin/areas/${n.passport_area_id}/businesses/${n.business_id}` : "/admin/businesses",
    };
  }
  return {
    label: "Marketing Request",
    detail: `${n.businessName ?? n.areaName} submitted a marketing request${
      n.marketingRequestTitle ? ` - ${n.marketingRequestTitle}` : ""
    }.`,
    href: "/admin/marketing-requests",
  };
}

export default async function AdminNotificationsPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/notifications");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0 && currentUser.areaAssignments.length === 0) {
    redirect("/admin");
  }

  const { tab } = await searchParams;
  const activeTab =
    tab === "unread" || tab === "business_pending_review" || tab === "marketing_request_submitted" ? tab : "all";

  const areaIds = await getAdminScopedAreaIds(currentUser);
  const [notifications, lastReadAtValue] = await Promise.all([
    getAdminNotifications(areaIds),
    getAdminNotificationsLastReadAt(currentUser.id),
  ]);
  const lastRead = lastReadAtValue ? new Date(lastReadAtValue) : null;

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !lastRead || new Date(n.created_at) > lastRead;
    if (activeTab === "business_pending_review" || activeTab === "marketing_request_submitted") {
      return n.notification_type === activeTab;
    }
    return true;
  });

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "business_pending_review", label: "Business approvals" },
    { key: "marketing_request_submitted", label: "Marketing requests" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-slate-600">
            Businesses pending review and marketing requests submitted within your scope.
          </p>
        </div>
        <form action={markAdminNotificationsRead}>
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            Mark All as Read
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/notifications${t.key === "all" ? "" : `?tab=${t.key}`}`}
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
        {filtered.map((n) => {
          const isUnread = !lastRead || new Date(n.created_at) > lastRead;
          const { label, detail, href } = describe(n);
          return (
            <div
              key={n.id}
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                isUnread ? "border-slate-300 bg-slate-50" : "border-slate-200"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-sm text-slate-600">{detail}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <Link
                href={href}
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
