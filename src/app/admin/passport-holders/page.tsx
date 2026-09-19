import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds } from "@/lib/admin-scope";
import { getPassportsWithHolders } from "@/lib/admin-queries";
import { formatPassportNumber } from "@/lib/format";
import type { PassportStatus } from "@/lib/types/domain";

const STATUS_STYLES: Record<PassportStatus, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-slate-100 text-slate-600",
  revoked: "bg-red-100 text-red-700",
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
      <h1 className="text-2xl font-bold text-slate-900">Passport holders</h1>
      <p className="mt-1 text-slate-600">Every Passport that&apos;s been issued.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
            {passports.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{formatPassportNumber(p.passport_number)}</p>
                  <p className="text-xs text-slate-500">
                    {p.areaName ?? "Unknown region"}, {p.stateName ?? "Unknown state"}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-900">
                  {p.owner?.full_name || p.owner?.email || "Unknown holder"}
                  {p.owner?.deleted_at && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Deleted
                    </span>
                  )}
                  {p.owner?.suspended_at && !p.owner?.deleted_at && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Suspended
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  <p>{p.owner?.email ?? "-"}</p>
                  <p>{p.owner?.phone ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(p.purchased_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(p.expires_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{p.owner?.age_range ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {p.travel_start_date && p.travel_end_date ? (
                    <>
                      {new Date(p.travel_start_date).toLocaleDateString()} –{" "}
                      {new Date(p.travel_end_date).toLocaleDateString()}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
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
                      className="font-semibold text-slate-700 hover:underline"
                    >
                      View &rarr;
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {passports.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-4 text-sm text-slate-500">
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
