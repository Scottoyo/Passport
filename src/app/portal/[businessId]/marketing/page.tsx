import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { MARKETING_SERVICES } from "@/lib/marketing-services";
import type { MarketingRequest } from "@/lib/types/domain";
import { createBusinessMarketingRequest } from "../actions";
import { buttonClasses } from "@/lib/ui-classes";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalMarketingPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  const { data: requests } = await supabase
    .from("marketing_requests")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .returns<MarketingRequest[]>();

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">Marketing</h2>
      <p className="mt-1 text-ink-muted">
        Reach more Passport holders and put your business in front of visitors. Requests go to a
        regional manager for review, approval, and payment - nothing here is applied automatically.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETING_SERVICES.map((service) => (
          <div key={service.key} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">{service.label}</h3>
              <span className="text-sm font-semibold text-ink-muted">{service.price}</span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{service.description}</p>
            <ul className="mt-3 space-y-1 text-xs text-ink-muted">
              {service.features.map((f) => (
                <li key={f}>&#10003; {f}</li>
              ))}
            </ul>
            <details className="mt-4">
              <summary className={`cursor-pointer text-center ${buttonClasses("primary")}`}>
                Request this service
              </summary>
              <form
                action={createBusinessMarketingRequest.bind(null, businessId, service.key)}
                className="mt-3 space-y-2 border-t border-border pt-3"
              >
                <textarea
                  name="details"
                  required
                  placeholder="Describe your campaign goals, audience, and any specific details."
                  rows={3}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    name="start_date"
                    type="date"
                    className="w-1/2 rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <input
                    name="end_date"
                    type="date"
                    className="w-1/2 rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <input
                  name="contact_email"
                  type="email"
                  placeholder="Contact email (optional)"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <button className={`w-full ${buttonClasses("primary")}`}>
                  Submit request
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Your requests</h3>
        <ul className="mt-3 divide-y divide-border">
          {(requests ?? []).map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{r.title}</span>
                <span className="text-xs font-semibold capitalize text-ink-muted">{r.status}</span>
              </div>
              {(r.start_date || r.end_date) && (
                <p className="mt-1 text-xs text-ink-muted">
                  Scheduled: {r.start_date ?? "?"} &ndash; {r.end_date ?? "?"}
                </p>
              )}
              {r.admin_notes && (
                <p className="mt-1 text-xs text-ink-muted">Manager note: {r.admin_notes}</p>
              )}
            </li>
          ))}
          {(requests ?? []).length === 0 && (
            <li className="py-3 text-sm text-ink-muted">No requests submitted yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
