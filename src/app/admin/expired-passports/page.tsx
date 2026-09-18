import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getPassportsWithHolders } from "@/lib/admin-queries";

export default async function ExpiredPassportsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const { state } = await getCurrentAdminScope();
  const passports = await getPassportsWithHolders({ stateId: state?.id, expiredOnly: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Expired passports</h1>
      <p className="mt-1 text-slate-600">
        Passports marked expired, or past their <code>expires_at</code> date.
      </p>

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {passports.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              {p.owner ? (
                <Link href={`/admin/passport-holders/${p.owner.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                  {p.owner.full_name || p.owner.email || "Unknown holder"}
                </Link>
              ) : (
                <p className="text-sm font-medium text-slate-900">Unknown holder</p>
              )}
              <p className="text-xs text-slate-500">
                Purchased {new Date(p.purchased_at).toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Expired {new Date(p.expires_at).toLocaleDateString()}
            </span>
          </li>
        ))}
        {passports.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No expired Passports in this view.</li>
        )}
      </ul>
    </div>
  );
}
