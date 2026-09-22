import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessesForUser } from "@/lib/portal-queries";
import { buttonClasses } from "@/lib/ui-classes";

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
        <h1 className="text-2xl font-bold text-ink">No business access yet</h1>
        <p className="mt-2 text-ink-muted">
          {user.email} isn&apos;t the owner of any business yet, and hasn&apos;t been added as
          staff to one. Register a business or ask its owner to add you.
        </p>
        <Link
          href="/register-business"
          className={`mt-6 inline-block ${buttonClasses("primary")}`}
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
      <h1 className="text-2xl font-bold text-ink">Your businesses</h1>
      <p className="mt-1 text-ink-muted">Choose which business to manage.</p>
      <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
        {businesses.map((b) => (
          <li key={b.id}>
            <Link
              href={`/portal/${b.id}`}
              className="block px-6 py-4 text-sm font-medium text-ink hover:bg-surface-elevated"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
