import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAllStatesForAdmin } from "@/lib/admin-scope";
import { PromoCodeScopeSelect, type ScopeStateOption } from "@/components/admin/promo-code-scope-select";
import type { PromoCode, PassportArea, State } from "@/lib/types/domain";
import { createPromoCode, setPromoCodeStatus, deletePromoCode } from "./actions";

export default async function PromoCodesAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/promo-codes");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0 && currentUser.areaAssignments.length === 0) {
    redirect("/admin");
  }

  const supabase = await createClient();
  // RLS already scopes this exactly right: national admin sees every code,
  // a state manager sees only their state's, a region manager only their
  // region's - no app-layer filtering needed for the list itself.
  const { data: codes } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PromoCode[]>();
  const allCodes = codes ?? [];

  const stateIds = [...new Set(allCodes.map((c) => c.scope_state_id).filter((id): id is string => Boolean(id)))];
  const areaIds = [...new Set(allCodes.map((c) => c.scope_area_id).filter((id): id is string => Boolean(id)))];
  const [{ data: nameStates }, { data: nameAreas }] = await Promise.all([
    stateIds.length ? supabase.from("states").select("id, name").in("id", stateIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    areaIds.length ? supabase.from("passport_areas").select("id, name").in("id", areaIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const stateNameById = new Map((nameStates ?? []).map((s) => [s.id as string, s.name as string]));
  const areaNameById = new Map((nameAreas ?? []).map((a) => [a.id as string, a.name as string]));

  // Scope picker for the create form: a State select, plus a Region select
  // that appears once a state (with regions) is chosen - built here as
  // grouped ScopeStateOption[] data and handed to the client component that
  // actually cascades them (a plain server-rendered form can't cascade
  // without client JS).
  let scopeStates: ScopeStateOption[] = [];
  let fixedAreaLabel: string | null = null;
  let fixedAreaId: string | null = null;
  let multiRegionOptions: { value: string; label: string }[] | null = null;

  if (isNationalAdmin) {
    const [allStates, { data: allAreas }] = await Promise.all([
      getAllStatesForAdmin(),
      supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
    ]);
    scopeStates = allStates.map((s) => ({
      id: s.id,
      name: s.name,
      areas: (allAreas ?? []).filter((a) => a.state_id === s.id).map((a) => ({ id: a.id, name: a.name })),
    }));
  } else if (currentUser.stateAssignments.length > 0) {
    const myStateIds = [...new Set(currentUser.stateAssignments.map((s) => s.state_id))];
    const [{ data: myStates }, { data: myAreas }] = await Promise.all([
      supabase.from("states").select("*").in("id", myStateIds).order("name").returns<State[]>(),
      supabase.from("passport_areas").select("*").in("state_id", myStateIds).order("name").returns<PassportArea[]>(),
    ]);
    scopeStates = (myStates ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      areas: (myAreas ?? []).filter((a) => a.state_id === s.id).map((a) => ({ id: a.id, name: a.name })),
    }));
  } else {
    const accessibleAreaIds = await getAccessibleAreaIds(currentUser);
    if (accessibleAreaIds.length <= 1) {
      const areaId = accessibleAreaIds[0];
      const { data: area } = areaId
        ? await supabase.from("passport_areas").select("id, name").eq("id", areaId).maybeSingle()
        : { data: null };
      fixedAreaLabel = area ? (area.name as string) : null;
      fixedAreaId = areaId ?? null;
    } else {
      const { data: myAreas } = await supabase
        .from("passport_areas")
        .select("id, name")
        .in("id", accessibleAreaIds)
        .order("name");
      multiRegionOptions = (myAreas ?? []).map((a) => ({ value: `area:${a.id}`, label: a.name as string }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Promo codes</h1>
      <p className="mt-1 text-slate-600">
        Discount codes applied at Passport checkout. National admins can create nationwide, state, or
        region codes; state managers within their state; region managers within their region.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Create a promo code</h2>
        <form action={createPromoCode} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Code</span>
            <input
              name="code"
              required
              placeholder="SUMMER25"
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Discount type</span>
            <select name="discount_type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="percent_off">Percent off</option>
              <option value="amount_off">Amount off (USD)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Value</span>
            <input
              name="discount_value"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="25"
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Max uses</span>
            <input
              name="max_uses"
              type="number"
              min="1"
              placeholder="Unlimited"
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Expires</span>
            <input name="expires_at" type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          {fixedAreaLabel ? (
            <>
              <input type="hidden" name="scope" value={`area:${fixedAreaId ?? ""}`} />
              <p className="text-sm text-slate-600">
                Scope: <span className="font-semibold">{fixedAreaLabel}</span>
              </p>
            </>
          ) : multiRegionOptions ? (
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Region</span>
              <select name="scope" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {multiRegionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <PromoCodeScopeSelect states={scopeStates} allowNational={isNationalAdmin} />
          )}
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Create code
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-slate-900">Existing codes</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allCodes.map((c) => {
                const scopeLabel = c.scope_area_id
                  ? (areaNameById.get(c.scope_area_id) ?? "Unknown region")
                  : c.scope_state_id
                    ? `All of ${stateNameById.get(c.scope_state_id) ?? "Unknown state"}`
                    : "National";
                const discountLabel =
                  c.discount_type === "percent_off" ? `${c.discount_value}% off` : `$${(c.discount_value / 100).toFixed(2)} off`;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{c.code}</td>
                    <td className="px-4 py-3 text-slate-600">{discountLabel}</td>
                    <td className="px-4 py-3 text-slate-600">{scopeLabel}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.times_used}
                      {c.max_uses ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          c.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={setPromoCodeStatus.bind(null, c.id, c.status === "active" ? "inactive" : "active")}>
                          <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                            {c.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <form action={deletePromoCode.bind(null, c.id)}>
                          <button className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-400">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {allCodes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No promo codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
