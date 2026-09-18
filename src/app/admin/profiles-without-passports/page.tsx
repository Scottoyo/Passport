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

      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {profiles.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{p.full_name ?? p.email ?? "Unnamed"}</p>
              <p className="text-xs text-slate-500">{p.email}</p>
            </div>
            <span className="text-xs text-slate-500">
              Signed up {new Date(p.created_at).toLocaleDateString()}
            </span>
          </li>
        ))}
        {profiles.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">Everyone who&apos;s signed in owns a Passport.</li>
        )}
      </ul>
    </div>
  );
}
