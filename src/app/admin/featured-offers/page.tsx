import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds } from "@/lib/admin-scope";
import { getAllOffersNational } from "@/lib/admin-queries";
import { setOfferFeatured } from "./actions";
import { buttonClasses } from "@/lib/ui-classes";

export default async function FeaturedOffersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/featured-offers");
  if (
    !currentUser.isNationalAdmin &&
    currentUser.stateAssignments.length === 0 &&
    currentUser.areaAssignments.length === 0
  ) {
    redirect("/admin");
  }

  const { state, area } = await getCurrentAdminScope();
  const baseAreaIds = currentUser.isNationalAdmin
    ? state
      ? await getAreaIdsForState(state.id)
      : null
    : await getAccessibleAreaIds(currentUser);
  const scopedAreaIds = baseAreaIds ? narrowAreaIds(baseAreaIds, area) : null;

  const offers = await getAllOffersNational(scopedAreaIds ? { areaIds: scopedAreaIds } : {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Featured offers</h1>
      <p className="mt-1 text-ink-muted">
        Feature an offer to highlight it. (Where featured offers surface on
        the public site is a follow-up.)
      </p>

      <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
        {offers.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{o.title}</p>
              <p className="text-xs text-ink-muted">
                {o.businessName}
                {o.areaName ? ` &middot; ${o.areaName}` : ""}
                {o.stateName ? `, ${o.stateName}` : ""}
              </p>
            </div>
            <form action={setOfferFeatured.bind(null, o.id, !o.featured)}>
              <button
                className={o.featured ? buttonClasses("primary", "sm") : buttonClasses("outline", "sm")}
              >
                {o.featured ? "Featured - unfeature" : "Feature"}
              </button>
            </form>
          </li>
        ))}
        {offers.length === 0 && (
          <li className="px-6 py-4 text-sm text-ink-muted">No offers in this view.</li>
        )}
      </ul>
    </div>
  );
}
