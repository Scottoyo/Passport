import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope, getAllStatesForAdmin } from "@/lib/admin-scope";
import { getAllPassportProducts } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { createPassportProduct, setPassportProductStatus, updatePassportProductName } from "./actions";
import type { PassportArea, PassportProduct } from "@/lib/types/domain";
import { buttonClasses } from "@/lib/ui-classes";

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
      <h1 className="text-2xl font-bold text-ink">Passport products</h1>
      <p className="mt-1 text-ink-muted">
        Each region has its own pricing - a Passport bought for one region
        only works in that region.
      </p>

      <div className="mt-8 space-y-8">
        {states.map((state) => (
          <div key={state.id} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-ink">{state.name}</h2>

            <div className="mt-4 space-y-6">
              {(areasByState.get(state.id) ?? []).map((area) => (
                <div key={area.id} className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-ink">{area.name}</h3>

                  <div className="mt-3 space-y-3">
                    {(productsByArea.get(area.id) ?? []).map((p) => (
                      <div key={p.id} className="rounded-lg bg-surface-elevated p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-ink">{p.name}</h4>
                            <StatusBadge status={p.status} />
                          </div>
                          <StatusActions
                            current={p.status}
                            launch={setPassportProductStatus.bind(null, p.id, "active")}
                            pause={setPassportProductStatus.bind(null, p.id, "paused")}
                            draft={setPassportProductStatus.bind(null, p.id, "draft")}
                          />
                        </div>
                        <p className="mt-2 text-sm text-ink-muted">
                          ${(p.price_cents / 100).toFixed(2)} &middot; {p.duration_days} days
                        </p>
                        {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">
                            Edit name
                          </summary>
                          <form
                            action={updatePassportProductName.bind(null, p.id)}
                            className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3"
                          >
                            <label className="text-sm">
                              <span className="mb-1 block text-ink-muted">Name</span>
                              <input
                                name="name"
                                required
                                defaultValue={p.name}
                                className="rounded-lg border border-border px-3 py-2 text-sm"
                              />
                            </label>
                            <button className={buttonClasses("outline", "sm")}>Save</button>
                          </form>
                        </details>
                      </div>
                    ))}
                    {(productsByArea.get(area.id) ?? []).length === 0 && (
                      <p className="text-sm text-ink-muted">No products for {area.name} yet.</p>
                    )}
                  </div>

                  <form
                    action={createPassportProduct}
                    className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
                  >
                    <input type="hidden" name="passport_area_id" value={area.id} />
                    <label className="text-sm">
                      <span className="mb-1 block text-ink-muted">Name</span>
                      <input
                        name="name"
                        required
                        placeholder={`${area.name} Passport`}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-ink-muted">Price (USD)</span>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="49.00"
                        className="w-28 rounded-lg border border-border px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-ink-muted">Duration (days)</span>
                      <input
                        name="duration_days"
                        type="number"
                        min="1"
                        defaultValue={365}
                        className="w-24 rounded-lg border border-border px-3 py-2 text-sm"
                      />
                    </label>
                    <button className={buttonClasses("outline")}>
                      Add product
                    </button>
                  </form>
                </div>
              ))}
              {(areasByState.get(state.id) ?? []).length === 0 && (
                <p className="text-sm text-ink-muted">No regions in {state.name} yet.</p>
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
          <button className="rounded-full bg-success px-3 py-1 font-semibold text-white hover:opacity-90">
            Launch
          </button>
        </form>
      )}
      {current === "active" && (
        <form action={pause}>
          <button className="rounded-full bg-warning px-3 py-1 font-semibold text-white hover:opacity-90">
            Pause
          </button>
        </form>
      )}
      {current !== "draft" && (
        <form action={draft}>
          <button className="rounded-full bg-surface-elevated px-3 py-1 font-semibold text-ink hover:bg-border">
            Move to draft
          </button>
        </form>
      )}
    </div>
  );
}
