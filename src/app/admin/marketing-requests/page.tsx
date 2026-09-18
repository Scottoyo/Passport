import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { resolveStateFilter, getAllStatesForAdmin, getAreaIdsForState, NO_MATCH_ID } from "@/lib/admin-scope";
import { ScopeFilter } from "@/components/admin/scope-filter";
import type { MarketingRequest, PassportArea } from "@/lib/types/domain";
import { updateMarketingRequestStatus } from "./actions";

export default async function MarketingRequestsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const resolvedSearchParams = await searchParams;
  const [{ state }, states] = await Promise.all([
    resolveStateFilter(resolvedSearchParams),
    getAllStatesForAdmin(),
  ]);

  const supabase = await createClient();
  let requestsQuery = supabase
    .from("marketing_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (state) {
    const areaIds = await getAreaIdsForState(state.id);
    requestsQuery = requestsQuery.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  }

  const [{ data: requests }, { data: areas }] = await Promise.all([
    requestsQuery.returns<MarketingRequest[]>(),
    supabase.from("passport_areas").select("*").returns<PassportArea[]>(),
  ]);

  const areaNameById = new Map((areas ?? []).map((a) => [a.id, a.name]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Marketing requests</h1>
      <p className="mt-1 text-slate-600">
        Requests submitted by managers and franchisees across every Passport
        Area.
      </p>

      <div className="mt-6">
        <ScopeFilter states={states} current={state} />
      </div>

      <div className="mt-8 space-y-4">
        {(requests ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {areaNameById.get(r.passport_area_id) ?? "Unknown area"}
                </p>
                <h2 className="font-semibold text-slate-900">{r.title}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                {r.status}
              </span>
            </div>
            {r.details && <p className="mt-2 text-sm text-slate-600">{r.details}</p>}

            <form action={updateMarketingRequestStatus.bind(null, r.id, "in_review")} className="mt-4 flex flex-wrap items-end gap-2">
              <textarea
                name="admin_notes"
                defaultValue={r.admin_notes ?? ""}
                placeholder="Notes for the requester"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <StatusButton status="in_review" requestId={r.id} label="Mark in review" />
                <StatusButton status="approved" requestId={r.id} label="Approve" />
                <StatusButton status="declined" requestId={r.id} label="Decline" />
                <StatusButton status="completed" requestId={r.id} label="Mark complete" />
              </div>
            </form>
          </div>
        ))}
        {(requests ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No marketing requests yet.</p>
        )}
      </div>
    </div>
  );
}

function StatusButton({
  status,
  requestId,
  label,
}: {
  status: MarketingRequest["status"];
  requestId: string;
  label: string;
}) {
  return (
    <button
      formAction={updateMarketingRequestStatus.bind(null, requestId, status)}
      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
    >
      {label}
    </button>
  );
}
