import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { resolveStateFilter, getAllStatesForAdmin } from "@/lib/admin-scope";
import { getPassportsWithHolders } from "@/lib/admin-queries";
import { ScopeFilter } from "@/components/admin/scope-filter";
import type { PassportStatus } from "@/lib/types/domain";

const STATUS_STYLES: Record<PassportStatus, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-slate-100 text-slate-600",
  revoked: "bg-red-100 text-red-700",
};

export default async function PassportHoldersPage({
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

  const passports = await getPassportsWithHolders({ stateId: state?.id });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Passport holders</h1>
      <p className="mt-1 text-slate-600">Every Passport that&apos;s been issued.</p>

      <div className="mt-6">
        <ScopeFilter
          states={states}
          current={state}
          note="Passports are nationwide by design — a state filter here means “has redeemed an offer at a business in that state,” not ownership by that state."
        />
      </div>

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {passports.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {p.owner?.email ?? p.owner?.full_name ?? "Unknown holder"}
              </p>
              <p className="text-xs text-slate-500">
                Purchased {new Date(p.purchased_at).toLocaleDateString()} &middot; Expires{" "}
                {new Date(p.expires_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[p.status]}`}>
              {p.status}
            </span>
          </li>
        ))}
        {passports.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No Passports match this view.</li>
        )}
      </ul>
    </div>
  );
}
