import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { StatusBadge } from "@/components/status-badge";
import { OfferForm } from "@/components/business/offer-form";
import type { Offer } from "@/lib/types/domain";
import {
  createOffer,
  updateOffer,
  setOfferStatus,
} from "@/app/admin/areas/[areaId]/businesses/[businessId]/actions";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalOffersPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();
  const areaId = business.passport_area_id;

  const { data: offers } = await supabase
    .from("offers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .returns<Offer[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Offers</h2>
          <p className="mt-1 text-slate-600">View and manage the perks available at your business.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {(offers ?? []).map((offer) => (
          <div key={offer.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{offer.title}</p>
                {offer.description && <p className="text-sm text-slate-500">{offer.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={offer.status} />
                {offer.status !== "active" ? (
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
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {offer.redemptions_per_passport === null
                ? "Unlimited redemptions per Passport"
                : `${offer.redemptions_per_passport} redemption${offer.redemptions_per_passport === 1 ? "" : "s"} per Passport`}
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                Edit
              </summary>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <OfferForm
                  offer={offer}
                  action={updateOffer.bind(null, areaId, businessId, offer.id)}
                  submitLabel="Update offer"
                />
              </div>
            </details>
          </div>
        ))}
        {(offers ?? []).length === 0 && <p className="text-sm text-slate-500">No offers yet.</p>}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900">Add offer</h3>
        <div className="mt-4">
          <OfferForm action={createOffer.bind(null, areaId, businessId)} submitLabel="Add offer" />
        </div>
      </section>
    </div>
  );
}
