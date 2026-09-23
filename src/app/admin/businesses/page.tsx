import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, canManageArea, getAccessibleAreaIds } from "@/lib/permissions";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds, NO_MATCH_ID } from "@/lib/admin-scope";
import { getAllBusinessesNational } from "@/lib/admin-queries";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/lib/ui-classes";
import { BusinessesFilterBar } from "@/components/admin/businesses-filter-bar";
import { BusinessActionsMenu } from "@/components/admin/business-actions-menu";
import { ExportBusinessesCsvButton } from "@/components/admin/export-businesses-csv-button";
import { featureBusiness, unfeatureBusiness, setBusinessApproval } from "./actions";
import { isBusinessCurrentlyFeatured, featuredStatusLabel } from "@/lib/business-featured";
import type { BusinessApprovalStatus } from "@/lib/types/domain";

const APPROVAL_STYLES: Record<BusinessApprovalStatus, string> = {
  pending_review: "bg-warning-bg text-warning",
  approved: "bg-success-bg text-success",
  rejected: "bg-error-bg text-error",
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
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0 && currentUser.areaAssignments.length === 0) {
    redirect("/admin");
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const approval = params.approval ?? "";
  const categoryId = params.category ?? "";
  const featured = params.featured ?? "";
  const areaId = params.area ?? "";

  const { state: adminScopeState, area: scopeArea } = await getCurrentAdminScope();
  let scopeStateIds: string[] | undefined;
  // Businesses fetch scope, narrowed by region when one's selected -
  // scopeStateIds above stays state-wide regardless (it only feeds
  // getCategories, and categories have no region/area column).
  let businessAreaIds: string[] | null = null;
  if (isNationalAdmin) {
    const state = adminScopeState;
    scopeStateIds = state ? [state.id] : undefined;
    if (state) {
      const stateAreaIds = await getAreaIdsForState(state.id);
      businessAreaIds = narrowAreaIds(stateAreaIds, scopeArea);
    }
  } else if (currentUser.stateAssignments.length > 0) {
    scopeStateIds = [...new Set(currentUser.stateAssignments.map((s) => s.state_id))];
    const stateAreaIdLists = await Promise.all(scopeStateIds.map((id) => getAreaIdsForState(id)));
    businessAreaIds = narrowAreaIds(stateAreaIdLists.flat(), scopeArea);
  } else {
    const accessibleAreaIds = await getAccessibleAreaIds(currentUser);
    businessAreaIds = narrowAreaIds(accessibleAreaIds, scopeArea);
    const supabase = await createClient();
    const { data: areaRows } = await supabase
      .from("passport_areas")
      .select("state_id")
      .in("id", accessibleAreaIds.length ? accessibleAreaIds : [NO_MATCH_ID]);
    scopeStateIds = [...new Set((areaRows ?? []).map((a) => a.state_id as string))];
  }

  const [allBusinesses, categories] = await Promise.all([
    getAllBusinessesNational(businessAreaIds ? { areaIds: businessAreaIds } : {}),
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
    featured: isBusinessCurrentlyFeatured(b),
    updatedAt: new Date(b.updated_at).toLocaleDateString(),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Businesses</h1>
          <p className="mt-1 text-ink-muted">
            Every business across every Passport Area. Region managers, state
            managers, and national admins can each approve, reject, and
            feature businesses within their own hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportBusinessesCsvButton rows={csvRows} />
          <Link
            href="/admin/businesses/new"
            className={buttonClasses("primary")}
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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-elevated text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
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
          <tbody className="divide-y divide-border">
            {businesses.map((b) => {
              const detailBase = `/admin/areas/${b.passport_area_id}/businesses/${b.id}`;
              const canManage = canManageArea(currentUser, b.passport_area_id, "manage_businesses", b.stateId);
              return (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{b.name}</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[b.approval_status]}`}
                    >
                      {APPROVAL_LABELS[b.approval_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {(b.category_id && categoryNameById.get(b.category_id)) || "-"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {b.areaName ?? "Unknown area"}
                    {b.stateName ? `, ${b.stateName}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{featuredStatusLabel(b)}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(b.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <BusinessActionsMenu viewHref={`${detailBase}?mode=view`} editHref={`${detailBase}?mode=edit`}>
                      {canManage && b.approval_status === "pending_review" && (
                        <>
                          <form action={setBusinessApproval.bind(null, b.id, "approved")}>
                            <button className="block w-full px-3 py-1.5 text-left text-sm text-success hover:bg-surface-elevated">
                              Approve
                            </button>
                          </form>
                          <form action={setBusinessApproval.bind(null, b.id, "rejected")}>
                            <button className="block w-full px-3 py-1.5 text-left text-sm text-error hover:bg-surface-elevated">
                              Reject
                            </button>
                          </form>
                        </>
                      )}
                      {canManage && b.approval_status === "rejected" && (
                        <form action={setBusinessApproval.bind(null, b.id, "approved")}>
                          <button className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-elevated">
                            Approve anyway
                          </button>
                        </form>
                      )}
                      {canManage && b.approval_status === "approved" && (
                        b.featured ? (
                          <form action={unfeatureBusiness.bind(null, b.id)}>
                            <button className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-elevated">
                              Unfeature
                            </button>
                          </form>
                        ) : (
                          <>
                            <form action={featureBusiness.bind(null, b.id)}>
                              <input type="hidden" name="preset" value="7" />
                              <button className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-elevated">
                                Feature for 7 days
                              </button>
                            </form>
                            <form action={featureBusiness.bind(null, b.id)}>
                              <input type="hidden" name="preset" value="30" />
                              <button className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-elevated">
                                Feature for 30 days
                              </button>
                            </form>
                            <Link
                              href={`${detailBase}?mode=view`}
                              className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-elevated"
                            >
                              Feature (custom dates)…
                            </Link>
                          </>
                        )
                      )}
                    </BusinessActionsMenu>
                  </td>
                </tr>
              );
            })}
            {businesses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-sm text-ink-muted">
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
