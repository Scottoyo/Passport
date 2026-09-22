import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { signOut } from "@/app/auth/actions";

interface Props {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}

export default async function PortalBusinessLayout({ children, params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  const nav = [
    { href: `/portal/${businessId}`, label: "Dashboard" },
    { href: `/portal/${businessId}/profile`, label: "Profile" },
    { href: `/portal/${businessId}/offers`, label: "Offers" },
    { href: `/portal/${businessId}/redemptions`, label: "Redemptions" },
    { href: `/portal/${businessId}/marketing`, label: "Marketing" },
    { href: `/portal/${businessId}/referrals`, label: "Referrals" },
    { href: `/portal/${businessId}/staff`, label: "Business Users" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Business Portal</p>
          <h1 className="font-display text-lg font-semibold text-ink">{business.name}</h1>
          <p className="text-xs text-ink-muted">{user.email}</p>
        </div>
        <form action={signOut}>
          <button className="text-sm font-semibold text-error hover:underline">Log Out</button>
        </form>
      </div>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-8">
        <aside className="md:w-48 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto pb-2 text-sm md:block md:space-y-1 md:overflow-visible md:pb-0">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap rounded-full border border-border px-4 py-2 font-medium text-ink hover:bg-surface-elevated md:block md:rounded-lg md:border-0 md:px-3 md:py-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
