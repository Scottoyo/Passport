import type { ReferralReportRow } from "@/lib/admin-queries";
import {
  setReferralSuspended,
  deleteReferralCode,
  setReferralPayoutRate,
  markReferralPayoutsPaid,
  type ReferralKind,
} from "@/app/admin/referrals-actions";
import { buttonClasses } from "@/lib/ui-classes";
import { SaveButton } from "@/components/save-button";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ReferralReportTable({ kind, rows }: { kind: ReferralKind; rows: ReferralReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated text-xs font-semibold uppercase tracking-wide text-ink-muted">
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
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.referrerId} className="align-top">
              <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
              <td className="px-4 py-3 font-mono text-ink-muted">{r.code}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    r.suspended ? "bg-error-bg text-error" : "bg-success-bg text-success"
                  }`}
                >
                  {r.suspended ? "Suspended" : "Active"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-muted">{r.uses}</td>
              <td className="px-4 py-3 text-ink-muted">{formatCents(r.revenueCents)}</td>
              <td className="px-4 py-3 font-semibold text-amber-700">{formatCents(r.payoutOwedCents)}</td>
              <td className="px-4 py-3 text-ink-muted">{formatCents(r.payoutPaidCents)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  <form action={setReferralPayoutRate.bind(null, kind, r.referrerId)} className="flex items-center gap-1">
                    <span className="text-xs text-ink-muted">$/referral</span>
                    <input
                      name="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(r.payoutRateCents / 100).toFixed(2)}
                      className="w-20 rounded-lg border border-border px-2 py-1 text-xs"
                    />
                    <SaveButton variant="outline" size="sm">Save</SaveButton>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    <form action={setReferralSuspended.bind(null, kind, r.referrerId, !r.suspended)}>
                      <button className={buttonClasses("outline", "sm")}>
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
                      <button className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-error hover:border-red-400">
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
              <td colSpan={8} className="px-4 py-6 text-center text-ink-muted">
                No referral activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
