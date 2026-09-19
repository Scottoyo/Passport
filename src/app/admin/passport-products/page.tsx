import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope, getAllStatesForAdmin } from "@/lib/admin-scope";
import { getAllPassportProducts } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { createPassportProduct, setPassportProductStatus } from "./actions";
import type { PassportArea, PassportProduct } from "@/lib/types/domain";

export default async function PassportProductsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const { state: scopeState } = await getCurrentAdminScope();
  const [states, products] = await Promise.all([
    scopeState ? Promise.resolve([scopeState]) : getAllStatesForAdmin(),
    getAllPassportProducts({ stateId: scopeState?.id }),
  ]);

  const stateIds = states.map((s) => s.id);
  const supabase = await createClient();
  const { data: areaRows } = stateIds.length
    ? await supabase.from("passport_areas").select("*").in("state_id", stateIds).order("name").returns<PassportArea[]>()
    : { data: [] as PassportArea[] };
  const areas = areaRows ?? [];

  const areasByState = new Map<string, PassportArea[]>();
  for (const area of areas) {
    const list = areasByState.get(area.state_id) ?? [];
    list.push(area);
    areasByState.set(area.state_id, list);
  }

  const productsByArea = new Map<string, PassportProduct[]>();
  for (const p of products) {
    const list = productsByArea.get(p.passport_area_id) ?? [];
    list.push(p);
    productsByArea.set(p.passport_area_id, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Passport products</h1>
      <p className="mt-1 text-slate-600">
        Each region has its own pricing - a Passport bought for one region
        only works in that region.
      </p>

      <div className="mt-8 space-y-8">
        {states.map((state) => (
          <div key={state.id} className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">{state.name}</h2>

            <div className="mt-4 space-y-6">
              {(areasByState.get(state.id) ?? []).map((area) => (
                <div key={area.id} className="rounded-xl border border-slate-100 p-4">
                  <h3 className="font-semibold text-slate-800">{area.name}</h3>

                  <div className="mt-3 space-y-3">
                    {(productsByArea.get(area.id) ?? []).map((p) => (
                      <div key={p.id} className="rounded-lg bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-slate-900">{p.name}</h4>
                            <StatusBadge status={p.status} />
                          </div>
                          <StatusActions
                            current={p.status}
                            launch={setPassportProductStatus.bind(null, p.id, "active")}
                            pause={setPassportProductStatus.bind(null, p.id, "paused")}
                            draft={setPassportProductStatus.bind(null, p.id, "draft")}
                          />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          ${(p.price_cents / 100).toFixed(2)} &middot; {p.duration_days} days
                        </p>
                        {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}
                      </div>
                    ))}
                    {(productsByArea.get(area.id) ?? []).length === 0 && (
                      <p className="text-sm text-slate-500">No products for {area.name} yet.</p>
                    )}
                  </div>

                  <form
                    action={createPassportProduct}
                    className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
                  >
                    <input type="hidden" name="passport_area_id" value={area.id} />
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Name</span>
                      <input
                        name="name"
                        required
                        placeholder={`${area.name} Passport`}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Price (USD)</span>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="49.00"
                        className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-slate-600">Duration (days)</span>
                      <input
                        name="duration_days"
                        type="number"
                        min="1"
                        defaultValue={365}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
                      Add product
                    </button>
                  </form>
                </div>
              ))}
              {(areasByState.get(state.id) ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No regions in {state.name} yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusActions({
  current,
  launch,
  pause,
  draft,
}: {
  current: string;
  launch: () => Promise<void>;
  pause: () => Promise<void>;
  draft: () => Promise<void>;
}) {
  return (
    <div className="flex gap-2 text-xs">
      {current !== "active" && (
        <form action={launch}>
          <button className="rounded-full bg-green-600 px-3 py-1 font-semibold text-white hover:bg-green-500">
            Launch
          </button>
        </form>
      )}
      {current === "active" && (
        <form action={pause}>
          <button className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-400">
            Pause
          </button>
        </form>
      )}
      {current !== "draft" && (
        <form action={draft}>
          <button className="rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-300">
            Move to draft
          </button>
        </form>
      )}
    </div>
  );
}
