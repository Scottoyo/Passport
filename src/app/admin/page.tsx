import Link from "next/link";
import { getCurrentUser, assignedAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea } from "@/lib/types/domain";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const supabase = await createClient();

  if (currentUser.isNationalAdmin) {
    const [
      { count: stateCount },
      { count: areaCount },
      { count: businessCount },
      { count: pendingRequests },
      { count: passportCount },
      { count: expiredCount },
    ] = await Promise.all([
      supabase.from("states").select("*", { count: "exact", head: true }),
      supabase.from("passport_areas").select("*", { count: "exact", head: true }),
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase
        .from("marketing_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "submitted"),
      supabase.from("passports").select("*", { count: "exact", head: true }),
      supabase
        .from("passports")
        .select("*", { count: "exact", head: true })
        .eq("status", "expired"),
    ]);

    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900">National admin dashboard</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="States" value={stateCount ?? 0} />
          <Stat label="Passport Areas" value={areaCount ?? 0} />
          <Stat label="Businesses" value={businessCount ?? 0} />
          <Stat label="Passport holders" value={passportCount ?? 0} />
          <Stat label="Expired passports" value={expiredCount ?? 0} />
          <Stat label="Pending requests" value={pendingRequests ?? 0} />
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/admin/locations" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            Manage states &amp; areas &rarr;
          </Link>
          <Link href="/admin/passport-holders" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            View passport holders &rarr;
          </Link>
          <Link href="/admin/marketing-requests" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            Review marketing requests &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const areaIds = assignedAreaIds(currentUser);
  const { data: areas } = await supabase
    .from("passport_areas")
    .select("*")
    .in("id", areaIds)
    .returns<PassportArea[]>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your areas</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(areas ?? []).map((area) => (
          <Link
            key={area.id}
            href={`/admin/areas/${area.id}`}
            className="rounded-2xl border border-slate-200 p-6 hover:border-slate-400"
          >
            <h2 className="font-semibold text-slate-900">{area.name}</h2>
            <p className="mt-1 text-sm text-slate-500 capitalize">{area.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-6">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
