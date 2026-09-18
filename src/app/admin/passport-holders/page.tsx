import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getPassportsWithHolders } from "@/lib/admin-queries";
import type { PassportStatus } from "@/lib/types/domain";

const STATUS_STYLES: Record<PassportStatus, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-slate-100 text-slate-600",
  revoked: "bg-red-100 text-red-700",
};

export default async function PassportHoldersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const { state } = await getCurrentAdminScope();
  const passports = await getPassportsWithHolders({ stateId: state?.id });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Passport holders</h1>
      <p className="mt-1 text-slate-600">Every Passport that&apos;s been issued.</p>

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
