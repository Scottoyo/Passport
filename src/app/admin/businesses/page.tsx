import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getAllBusinessesNational } from "@/lib/admin-queries";
import { getCategories } from "@/lib/queries";
import { StatusBadge } from "@/components/status-badge";
import { BusinessesFilterBar } from "@/components/admin/businesses-filter-bar";
import { BusinessActionsMenu } from "@/components/admin/business-actions-menu";
import { ExportBusinessesCsvButton } from "@/components/admin/export-businesses-csv-button";
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

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    approval?: string;
    category?: string;
    featured?: string;
    area?: string;
  }>;
}

export default async function BusinessesAdminPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/businesses");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0) redirect("/admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const approval = params.approval ?? "";
  const categoryId = params.category ?? "";
  const featured = params.featured ?? "";
  const areaId = params.area ?? "";

  const adminScope = isNationalAdmin ? (await getCurrentAdminScope()).state : null;
  const scopeStateIds = isNationalAdmin
    ? adminScope
      ? [adminScope.id]
      : undefined
    : [...new Set(currentUser.stateAssignments.map((s) => s.state_id))];

  const [allBusinesses, categories] = await Promise.all([
    isNationalAdmin
      ? getAllBusinessesNational({ stateId: adminScope?.id })
      : getAllBusinessesNational({ stateIds: scopeStateIds }),
    getCategories(scopeStateIds),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const businesses = allBusinesses.filter((b) => {
    if (q && !b.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (status && b.status !== status) return false;
    if (approval && b.approval_status !== approval) return false;
    if (categoryId && b.category_id !== categoryId) return false;
    if (featured === "yes" && !b.featured) return false;
    if (featured === "no" && b.featured) return false;
    if (areaId && b.passport_area_id !== areaId) return false;
    return true;
  });

  const areaOptions = [...new Map(allBusinesses.map((b) => [b.passport_area_id, b.areaName ?? "Unknown area"])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const csvRows = businesses.map((b) => ({
    name: b.name,
    category: (b.category_id && categoryNameById.get(b.category_id)) || "",
    area: b.areaName ?? "",
    state: b.stateName ?? "",
    status: b.status,
    approvalStatus: APPROVAL_LABELS[b.approval_status],
    featured: b.featured,
    updatedAt: new Date(b.updated_at).toLocaleDateString(),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Businesses</h1>
          <p className="mt-1 text-slate-600">
            Every business across every Passport Area. New submissions from
            managers/franchisees need approval here before they can be edited
            or launched.
            {!isNationalAdmin &&
              " Approving, rejecting, and featuring a business stays a national-admin action."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportBusinessesCsvButton rows={csvRows} />
          <Link
            href="/admin/businesses/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Add Business
          </Link>
        </div>
      </div>

      <BusinessesFilterBar
        basePath="/admin/businesses"
        q={q}
        status={status}
        approval={approval}
        categoryId={categoryId}
        featured={featured}
        areaId={areaId}
        categories={categoryOptions}
        areas={areaOptions}
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {businesses.map((b) => {
              const detailBase = `/admin/areas/${b.passport_area_id}/businesses/${b.id}`;
              return (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{b.name}</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[b.approval_status]}`}
                    >
                      {APPROVAL_LABELS[b.approval_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {(b.category_id && categoryNameById.get(b.category_id)) || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {b.areaName ?? "Unknown area"}
                    {b.stateName ? `, ${b.stateName}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.featured ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(b.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <BusinessActionsMenu viewHref={`${detailBase}?mode=view`} editHref={`${detailBase}?mode=edit`}>
                      {isNationalAdmin && b.approval_status === "pending_review" && (
                        <>
                          <form action={setBusinessApproval.bind(null, b.id, "approved")}>
                            <button className="block w-full px-3 py-1.5 text-left text-sm text-green-700 hover:bg-slate-50">
                              Approve
                            </button>
                          </form>
                          <form action={setBusinessApproval.bind(null, b.id, "rejected")}>
                            <button className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-slate-50">
                              Reject
                            </button>
                          </form>
                        </>
                      )}
                      {isNationalAdmin && b.approval_status === "rejected" && (
                        <form action={setBusinessApproval.bind(null, b.id, "approved")}>
                          <button className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                            Approve anyway
                          </button>
                        </form>
                      )}
                      {isNationalAdmin && b.approval_status === "approved" && (
                        <form action={setBusinessFeatured.bind(null, b.id, !b.featured)}>
                          <button className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                            {b.featured ? "Unfeature" : "Feature"}
                          </button>
                        </form>
                      )}
                    </BusinessActionsMenu>
                  </td>
                </tr>
              );
            })}
            {businesses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-sm text-slate-500">
                  No businesses match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
