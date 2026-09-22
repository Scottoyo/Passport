import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds } from "@/lib/admin-scope";
import { getPassportsWithHolders } from "@/lib/admin-queries";
import { formatPassportNumber } from "@/lib/format";
import type { PassportStatus } from "@/lib/types/domain";

const STATUS_STYLES: Record<PassportStatus, string> = {
  active: "bg-success-bg text-success",
  expired: "bg-surface-elevated text-ink-muted",
  revoked: "bg-error-bg text-error",
};

export default async function PassportHoldersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/passport-holders");

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

  const passports = await getPassportsWithHolders(scopedAreaIds ? { areaIds: scopedAreaIds } : {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Passport holders</h1>
      <p className="mt-1 text-ink-muted">Every Passport that&apos;s been issued.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-elevated text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Passport</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Start date</th>
              <th className="px-4 py-3">End date</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Travel dates</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {passports.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{formatPassportNumber(p.passport_number)}</p>
                  <p className="text-xs text-ink-muted">
                    {p.areaName ?? "Unknown region"}, {p.stateName ?? "Unknown state"}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink">
                  {p.owner?.full_name || p.owner?.email || "Unknown holder"}
                  {p.owner?.deleted_at && (
                    <span className="ml-2 rounded-full bg-error-bg px-2 py-0.5 text-xs font-semibold text-error">
                      Deleted
                    </span>
                  )}
                  {p.owner?.suspended_at && !p.owner?.deleted_at && (
                    <span className="ml-2 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">
                      Suspended
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  <p>{p.owner?.email ?? "-"}</p>
                  <p>{p.owner?.phone ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{new Date(p.purchased_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-ink-muted">{new Date(p.expires_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-ink-muted">{p.owner?.age_range ?? "-"}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {p.travel_start_date && p.travel_end_date ? (
                    <>
                      {new Date(p.travel_start_date).toLocaleDateString()} –{" "}
                      {new Date(p.travel_end_date).toLocaleDateString()}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {p.owner ? new Date(p.owner.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.owner && (
                    <Link
                      href={`/admin/passport-holders/${p.owner.id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      View &rarr;
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {passports.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-4 text-sm text-ink-muted">
                  No Passports match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
