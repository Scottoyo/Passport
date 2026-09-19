import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessesForUser } from "@/lib/portal-queries";

export default async function PortalIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const businesses = await getPortalBusinessesForUser(user.id);

  if (businesses.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-bold text-slate-900">No business access yet</h1>
        <p className="mt-2 text-slate-600">
          {user.email} isn&apos;t the owner of any business yet, and hasn&apos;t been added as
          staff to one. Register a business or ask its owner to add you.
        </p>
        <Link
          href="/register-business"
          className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Register a business
        </Link>
      </div>
    );
  }

  if (businesses.length === 1) {
    redirect(`/portal/${businesses[0].id}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your businesses</h1>
      <p className="mt-1 text-slate-600">Choose which business to manage.</p>
      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {businesses.map((b) => (
          <li key={b.id}>
            <Link
              href={`/portal/${b.id}`}
              className="block px-6 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
