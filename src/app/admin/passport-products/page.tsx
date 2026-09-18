import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getAllPassportProducts } from "@/lib/admin-queries";
import { StatusBadge } from "@/components/status-badge";
import { createPassportProduct, setPassportProductStatus } from "./actions";

export default async function PassportProductsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const products = await getAllPassportProducts();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Passport products</h1>
      <p className="mt-1 text-slate-600">
        One nationwide product line — no state filter here. The active
        product with the lowest price is what customers see on{" "}
        <code>/passport</code>.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Add a product</h2>
        <form action={createPassportProduct} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input name="name" required placeholder="Family Passport" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Price (USD)</span>
            <input name="price" type="number" step="0.01" min="0" required placeholder="49.00" className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Duration (days)</span>
            <input name="duration_days" type="number" min="1" defaultValue={365} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Max members</span>
            <input name="max_members" type="number" min="1" defaultValue={1} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Add product
          </button>
        </form>
      </section>

      <div className="mt-8 space-y-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
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
              ${(p.price_cents / 100).toFixed(2)} &middot; {p.duration_days} days &middot; up to {p.max_members}{" "}
              member{p.max_members === 1 ? "" : "s"}
            </p>
            {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-slate-500">No Passport products yet.</p>}
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
