import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds } from "@/lib/admin-scope";
import { getPassportsWithHolders } from "@/lib/admin-queries";

export default async function ExpiredPassportsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/expired-passports");
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

  const passports = await getPassportsWithHolders({
    ...(scopedAreaIds ? { areaIds: scopedAreaIds } : {}),
    expiredOnly: true,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Expired passports</h1>
      <p className="mt-1 text-ink-muted">
        Passports marked expired, or past their <code>expires_at</code> date.
      </p>

      <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
        {passports.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              {p.owner ? (
                <Link href={`/admin/passport-holders/${p.owner.id}`} className="text-sm font-medium text-ink hover:underline">
                  {p.owner.full_name || p.owner.email || "Unknown holder"}
                </Link>
              ) : (
                <p className="text-sm font-medium text-ink">Unknown holder</p>
              )}
              <p className="text-xs text-ink-muted">
                Purchased {new Date(p.purchased_at).toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
              Expired {new Date(p.expires_at).toLocaleDateString()}
            </span>
          </li>
        ))}
        {passports.length === 0 && (
          <li className="px-6 py-4 text-sm text-ink-muted">No expired Passports in this view.</li>
        )}
      </ul>
    </div>
  );
}
