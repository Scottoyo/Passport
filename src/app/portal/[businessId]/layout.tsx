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
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Business Portal</p>
          <h1 className="text-lg font-semibold text-slate-900">{business.name}</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <form action={signOut}>
          <button className="text-sm font-semibold text-red-600 hover:text-red-700">Log Out</button>
        </form>
      </div>
      <div className="mt-6 flex gap-8">
        <aside className="w-48 shrink-0">
          <nav className="space-y-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
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
