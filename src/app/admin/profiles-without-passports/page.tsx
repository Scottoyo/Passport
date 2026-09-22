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
      <h1 className="text-2xl font-bold text-ink">Profiles without Passports</h1>
      <p className="mt-1 text-ink-muted">
        Signed-in accounts that have never purchased a Passport. No state
        filter here - profiles aren&apos;t tied to a state.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-elevated text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Age range</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/passport-holders/${p.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {p.full_name || p.email || "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  <p>{p.email ?? "-"}</p>
                  <p>{p.phone ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{p.age_range ?? "-"}</td>
                <td className="px-4 py-3 text-ink-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {p.deleted_at ? (
                    <span className="rounded-full bg-error-bg px-2.5 py-0.5 text-xs font-semibold text-error">
                      Deleted
                    </span>
                  ) : p.suspended_at ? (
                    <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/passport-holders/${p.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    View &rarr;
                  </Link>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-ink-muted">
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
