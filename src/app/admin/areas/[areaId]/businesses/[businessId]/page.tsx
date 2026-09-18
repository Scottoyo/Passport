import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Business, Offer } from "@/lib/types/domain";
import { StatusBadge } from "@/components/status-badge";
import { createOffer, setOfferStatus } from "./actions";

interface Props {
  params: Promise<{ areaId: string; businessId: string }>;
}

export default async function BusinessAdminPage({ params }: Props) {
  const { areaId, businessId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const canOffers = canManageArea(currentUser, areaId, "manage_offers");
  const canView = canManageArea(currentUser, areaId, "view_metrics");
  const canBusinesses = canManageArea(currentUser, areaId, "manage_businesses");
  if (!canOffers && !canView && !canBusinesses) redirect("/admin");

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("passport_area_id", areaId)
    .maybeSingle<Business>();
  if (!business) notFound();

  const { data: offers } = await supabase
    .from("offers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .returns<Offer[]>();

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
        <StatusBadge status={business.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">{business.city}</p>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Offers</h2>
        <ul className="mt-3 space-y-3">
          {(offers ?? []).map((offer) => (
            <li key={offer.id} className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{offer.title}</span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={offer.status} />
                  {canOffers &&
                    (offer.status !== "active" ? (
                      <form action={setOfferStatus.bind(null, areaId, businessId, offer.id, "active")}>
                        <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                          Launch
                        </button>
                      </form>
                    ) : (
                      <form action={setOfferStatus.bind(null, areaId, businessId, offer.id, "paused")}>
                        <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400">
                          Pause
                        </button>
                      </form>
                    ))}
                </div>
              </div>
              {offer.description && (
                <p className="mt-1 text-sm text-slate-600">{offer.description}</p>
              )}
            </li>
          ))}
          {(offers ?? []).length === 0 && (
            <li className="text-sm text-slate-500">No offers yet.</li>
          )}
        </ul>

        {canOffers && (
          <form
            action={createOffer.bind(null, areaId, businessId)}
            className="mt-6 space-y-3 border-t border-slate-100 pt-4"
          >
            <input
              name="title"
              required
              placeholder="Offer title, e.g. 20% off your bill"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              placeholder="Description"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <select
                name="discount_type"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                defaultValue="other"
              >
                <option value="percent_off">% off</option>
                <option value="amount_off">$ off</option>
                <option value="bogo">Buy one, get one</option>
                <option value="freebie">Freebie</option>
                <option value="other">Other</option>
              </select>
              <input
                name="discount_value"
                type="number"
                step="0.01"
                placeholder="Value"
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Add offer
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
