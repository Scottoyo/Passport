import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getAllBusinessesNational } from "@/lib/admin-queries";
import { StatusBadge } from "@/components/status-badge";
import { setBusinessFeatured } from "./actions";

export default async function BusinessesAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const { state } = await getCurrentAdminScope();
  const businesses = await getAllBusinessesNational({ stateId: state?.id });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Businesses</h1>
      <p className="mt-1 text-slate-600">
        Every business across every Passport Area. To edit one, open its
        Passport Area&apos;s workspace.
      </p>

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {businesses.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-500">
                {b.areaName ?? "Unknown area"}
                {b.stateName ? `, ${b.stateName}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={b.status} />
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
