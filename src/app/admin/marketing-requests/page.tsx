import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds, NO_MATCH_ID } from "@/lib/admin-scope";
import { MARKETING_SERVICES, type MarketingService } from "@/lib/marketing-services";
import type { MarketingRequest, PassportArea } from "@/lib/types/domain";
import { MarketingRequestsTable, type MarketingRequestRow } from "@/components/admin/marketing-requests-table";

type Bucket = "pending" | "scheduled" | "live" | "completed" | "declined";

function bucketFor(status: MarketingRequest["status"]): Bucket {
  if (status === "submitted" || status === "in_review") return "pending";
  if (status === "approved") return "scheduled";
  if (status === "live") return "live";
  if (status === "completed") return "completed";
  return "declined";
}

const LEGACY_SERVICE: MarketingService = {
  key: "custom_campaign",
  label: "Other / Legacy",
  price: "",
  description: "Requests submitted before service categories were tracked.",
  features: [],
};

export default async function MarketingRequestsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/marketing-requests");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0 && currentUser.areaAssignments.length === 0) {
    redirect("/admin");
  }

  const supabase = await createClient();
  let requestsQuery = supabase
    .from("marketing_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const { state, area } = await getCurrentAdminScope();
  const baseAreaIds = isNationalAdmin
    ? state
      ? await getAreaIdsForState(state.id)
      : null
    : await getAccessibleAreaIds(currentUser);
  if (baseAreaIds) {
    const scopedAreaIds = narrowAreaIds(baseAreaIds, area);
    requestsQuery = requestsQuery.in("passport_area_id", scopedAreaIds.length ? scopedAreaIds : [NO_MATCH_ID]);
  }

  const [{ data: requests }, { data: areas }] = await Promise.all([
    requestsQuery.returns<MarketingRequest[]>(),
    supabase.from("passport_areas").select("*").returns<PassportArea[]>(),
  ]);
  const allRequests = requests ?? [];

  const businessIds = [...new Set(allRequests.map((r) => r.business_id).filter((id): id is string => Boolean(id)))];
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name").in("id", businessIds)
    : { data: [] as { id: string; name: string }[] };

  const areaNameById = new Map((areas ?? []).map((a) => [a.id, a.name]));
  const businessNameById = new Map((businesses ?? []).map((b) => [b.id as string, b.name as string]));

  const byService = new Map<string, MarketingRequest[]>();
  const legacy: MarketingRequest[] = [];
  for (const r of allRequests) {
    if (r.service_type) {
      const list = byService.get(r.service_type) ?? [];
      list.push(r);
      byService.set(r.service_type, list);
    } else {
      legacy.push(r);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Marketing</h1>
      <p className="mt-1 text-slate-600">
        Requests submitted by businesses, managers, and franchisees across every Passport Area.
      </p>

      {MARKETING_SERVICES.map((service) => (
        <ServiceSection
          key={service.key}
          service={service}
          requests={byService.get(service.key) ?? []}
          areaNameById={areaNameById}
          businessNameById={businessNameById}
        />
      ))}

      {legacy.length > 0 && (
        <ServiceSection
          service={LEGACY_SERVICE}
          requests={legacy}
          areaNameById={areaNameById}
          businessNameById={businessNameById}
        />
      )}

      <section className="mt-10 rounded-2xl border border-dashed border-slate-300 p-6">
        <h2 className="font-semibold text-slate-900">Marketing Products</h2>
        <p className="mt-1 text-sm text-slate-500">Coming soon.</p>
      </section>
    </div>
  );
}

function ServiceSection({
  service,
  requests,
  areaNameById,
  businessNameById,
}: {
  service: MarketingService;
  requests: MarketingRequest[];
  areaNameById: Map<string, string>;
  businessNameById: Map<string, string>;
}) {
  const counts: Record<Bucket, number> = {
    pending: 0,
    scheduled: 0,
    live: 0,
    completed: 0,
    declined: 0,
  };
  for (const r of requests) counts[bucketFor(r.status)] += 1;

  const rows: MarketingRequestRow[] = requests.map((r) => ({
    id: r.id,
    title: r.title,
    details: r.details,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    admin_notes: r.admin_notes,
    created_at: r.created_at,
    businessName: r.business_id ? (businessNameById.get(r.business_id) ?? "Unknown business") : null,
    areaName: areaNameById.get(r.passport_area_id) ?? "Unknown area",
  }));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{service.label}</h2>
        {service.price && <span className="text-sm font-semibold text-slate-500">{service.price}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Pending" value={counts.pending} />
        <StatChip label="Approved &amp; Scheduled" value={counts.scheduled} />
        <StatChip label="Live" value={counts.live} highlight />
        <StatChip label="Completed" value={counts.completed} />
      </div>

      <MarketingRequestsTable requests={rows} price={service.price} serviceLabel={service.label} />
    </section>
  );
}

function StatChip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight && value > 0 ? "border-green-200 bg-green-50" : "border-slate-200"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight && value > 0 ? "text-green-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

