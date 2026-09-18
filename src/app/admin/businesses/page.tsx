import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { resolveStateFilter, getAllStatesForAdmin } from "@/lib/admin-scope";
import { getAllBusinessesNational } from "@/lib/admin-queries";
import { ScopeFilter } from "@/components/admin/scope-filter";
import { StatusBadge } from "@/components/status-badge";

export default async function BusinessesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const resolvedSearchParams = await searchParams;
  const [{ state }, states] = await Promise.all([
    resolveStateFilter(resolvedSearchParams),
    getAllStatesForAdmin(),
  ]);

  const businesses = await getAllBusinessesNational({ stateId: state?.id });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Businesses</h1>
      <p className="mt-1 text-slate-600">
        Every business across every Passport Area. To edit one, open its
        Passport Area&apos;s workspace.
      </p>

      <div className="mt-6">
        <ScopeFilter states={states} current={state} />
      </div>

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
