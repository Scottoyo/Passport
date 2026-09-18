import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getAllBusinessesNational } from "@/lib/admin-queries";
import { StatusBadge } from "@/components/status-badge";
import { setBusinessFeatured, setBusinessApproval } from "./actions";
import type { BusinessApprovalStatus } from "@/lib/types/domain";

const APPROVAL_STYLES: Record<BusinessApprovalStatus, string> = {
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

const APPROVAL_LABELS: Record<BusinessApprovalStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export default async function BusinessesAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const { state } = await getCurrentAdminScope();
  const businesses = await getAllBusinessesNational({ stateId: state?.id });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Businesses</h1>
      <p className="mt-1 text-slate-600">
        Every business across every Passport Area. New submissions from
        managers/franchisees need approval here before they can be edited or
        launched.
      </p>

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {businesses.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-500">
                {b.areaName ?? "Unknown area"}
                {b.stateName ? `, ${b.stateName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={b.status} />
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[b.approval_status]}`}
              >
                {APPROVAL_LABELS[b.approval_status]}
              </span>

              {b.approval_status === "pending_review" && (
                <>
                  <form action={setBusinessApproval.bind(null, b.id, "approved")}>
                    <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                      Approve
                    </button>
                  </form>
                  <form action={setBusinessApproval.bind(null, b.id, "rejected")}>
                    <button className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">
                      Reject
                    </button>
                  </form>
                </>
              )}
              {b.approval_status === "rejected" && (
                <form action={setBusinessApproval.bind(null, b.id, "approved")}>
                  <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                    Approve anyway
                  </button>
                </form>
              )}

              {b.approval_status === "approved" && (
                <form action={setBusinessFeatured.bind(null, b.id, !b.featured)}>
                  <button
                    className={
                      b.featured
                        ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                        : "rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
                    }
                  >
                    {b.featured ? "Featured — unfeature" : "Feature"}
                  </button>
                </form>
              )}

              <Link
                href={`/admin/areas/${b.passport_area_id}`}
                className="text-sm font-semibold text-slate-700 hover:underline"
              >
                Manage &rarr;
              </Link>
            </div>
          </li>
        ))}
        {businesses.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No businesses in this view.</li>
        )}
      </ul>
    </div>
  );
}
