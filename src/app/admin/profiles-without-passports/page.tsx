import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getProfilesWithoutPassports } from "@/lib/admin-queries";

export default async function ProfilesWithoutPassportsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const profiles = await getProfilesWithoutPassports();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Profiles without Passports</h1>
      <p className="mt-1 text-slate-600">
        Signed-in accounts that have never purchased a Passport. No state
        filter here — profiles aren&apos;t tied to a state.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Age range</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/passport-holders/${p.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {p.full_name || p.email || "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  <p>{p.email ?? "—"}</p>
                  <p>{p.phone ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.age_range ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {p.deleted_at ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      Deleted
                    </span>
                  ) : p.suspended_at ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/passport-holders/${p.id}`}
                    className="font-semibold text-slate-700 hover:underline"
                  >
                    View &rarr;
                  </Link>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-slate-500">
                  Everyone who&apos;s signed in owns a Passport.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
