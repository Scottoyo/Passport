import type { ReferralReportRow } from "@/lib/admin-queries";
import {
  setReferralSuspended,
  deleteReferralCode,
  setReferralPayoutRate,
  markReferralPayoutsPaid,
  type ReferralKind,
} from "@/app/admin/referrals-actions";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ReferralReportTable({ kind, rows }: { kind: ReferralKind; rows: ReferralReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">{kind === "profile" ? "User" : "Business"}</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Uses</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Payout Owed</th>
            <th className="px-4 py-3">Payout Paid</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.referrerId} className="align-top">
              <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
              <td className="px-4 py-3 font-mono text-slate-600">{r.code}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    r.suspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {r.suspended ? "Suspended" : "Active"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.uses}</td>
              <td className="px-4 py-3 text-slate-600">{formatCents(r.revenueCents)}</td>
              <td className="px-4 py-3 font-semibold text-amber-700">{formatCents(r.payoutOwedCents)}</td>
              <td className="px-4 py-3 text-slate-600">{formatCents(r.payoutPaidCents)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  <form action={setReferralPayoutRate.bind(null, kind, r.referrerId)} className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">$/referral</span>
                    <input
                      name="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(r.payoutRateCents / 100).toFixed(2)}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button className="rounded-full border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      Save
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    <form action={setReferralSuspended.bind(null, kind, r.referrerId, !r.suspended)}>
                      <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                        {r.suspended ? "Unsuspend" : "Suspend"}
                      </button>
                    </form>
                    {r.payoutOwedCents > 0 && (
                      <form action={markReferralPayoutsPaid.bind(null, kind, r.referrerId)}>
                        <button className="rounded-full border border-green-300 px-3 py-1 text-xs font-semibold text-green-700 hover:border-green-500">
                          Mark paid
                        </button>
                      </form>
                    )}
                    <form action={deleteReferralCode.bind(null, kind, r.referrerId)}>
                      <button className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-400">
                        Delete code
                      </button>
                    </form>
                  </div>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                No referral activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
