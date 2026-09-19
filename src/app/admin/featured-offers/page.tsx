import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getAllOffersNational } from "@/lib/admin-queries";
import { setOfferFeatured } from "./actions";

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

  const offers = currentUser.isNationalAdmin
    ? await getAllOffersNational({ stateId: (await getCurrentAdminScope()).state?.id })
    : await getAllOffersNational({ areaIds: await getAccessibleAreaIds(currentUser) });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Featured offers</h1>
      <p className="mt-1 text-slate-600">
        Feature an offer to highlight it. (Where featured offers surface on
        the public site is a follow-up.)
      </p>

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {offers.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{o.title}</p>
              <p className="text-xs text-slate-500">
                {o.businessName}
                {o.areaName ? ` &middot; ${o.areaName}` : ""}
                {o.stateName ? `, ${o.stateName}` : ""}
              </p>
            </div>
            <form action={setOfferFeatured.bind(null, o.id, !o.featured)}>
              <button
                className={
                  o.featured
                    ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                    : "rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
                }
              >
                {o.featured ? "Featured - unfeature" : "Feature"}
              </button>
            </form>
          </li>
        ))}
        {offers.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No offers in this view.</li>
        )}
      </ul>
    </div>
  );
}
