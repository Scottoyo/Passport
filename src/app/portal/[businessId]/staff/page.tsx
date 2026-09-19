import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { portalAddStaff, portalRemoveStaff } from "../actions";

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
      <h2 className="text-2xl font-bold text-slate-900">Business users</h2>
      <p className="mt-1 text-slate-600">Users assigned to manage this business account.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {isOwner && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 text-slate-900">
                {(owner as { email: string; full_name: string | null } | null)?.email ?? "Unknown"}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Owner
                </span>
              </td>
              {isOwner && <td className="px-4 py-3" />}
            </tr>
            {(
              (staff ?? []) as unknown as { id: string; profiles: { email: string } | null }[]
            ).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-slate-900">{s.profiles?.email ?? "Unknown"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    Staff
                  </span>
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    <form action={portalRemoveStaff.bind(null, businessId, s.id)}>
                      <button className="text-xs font-semibold text-red-600 hover:text-red-700">Remove</button>
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
            <span className="mb-1 block text-slate-600">Staff email</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            Add user
          </button>
        </form>
      )}
      {!isOwner && (
        <p className="mt-4 text-sm text-slate-500">
          Only the business owner can add or remove business users.
        </p>
      )}
    </div>
  );
}
