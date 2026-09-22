import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { portalAddStaff, portalRemoveStaff } from "../actions";
import { buttonClasses } from "@/lib/ui-classes";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalStaffPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();
  const isOwner = business.created_by === user.id;

  const [{ data: owner }, { data: staff }] = await Promise.all([
    business.created_by
      ? supabase.from("profiles").select("email, full_name").eq("id", business.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("local_staff").select("id, profiles:user_id(email)").eq("business_id", businessId),
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">Business users</h2>
      <p className="mt-1 text-ink-muted">Users assigned to manage this business account.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-elevated text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {isOwner && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3 text-ink">
                {(owner as { email: string; full_name: string | null } | null)?.email ?? "Unknown"}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-semibold text-ink">
                  Owner
                </span>
              </td>
              {isOwner && <td className="px-4 py-3" />}
            </tr>
            {(
              (staff ?? []) as unknown as { id: string; profiles: { email: string } | null }[]
            ).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-ink">{s.profiles?.email ?? "Unknown"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-semibold text-ink">
                    Staff
                  </span>
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    <form action={portalRemoveStaff.bind(null, businessId, s.id)}>
                      <button className="text-xs font-semibold text-error hover:text-red-700">Remove</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <form action={portalAddStaff.bind(null, businessId)} className="mt-6 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Staff email</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <button className={buttonClasses("outline")}>
            Add user
          </button>
        </form>
      )}
      {!isOwner && (
        <p className="mt-4 text-sm text-ink-muted">
          Only the business owner can add or remove business users.
        </p>
      )}
    </div>
  );
}
