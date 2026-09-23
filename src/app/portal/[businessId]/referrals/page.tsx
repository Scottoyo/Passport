import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { generateBusinessReferralCode, setCustomBusinessReferralCode } from "../actions";
import { buttonClasses } from "@/lib/ui-classes";
import { SaveButton } from "@/components/save-button";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalReferralsPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  const { data: area } = await supabase
    .from("passport_areas")
    .select("slug, states(slug)")
    .eq("id", business.passport_area_id)
    .maybeSingle();
  const stateSlug = (area?.states as unknown as { slug: string } | null)?.slug;
  const referralLink =
    business.referral_code && area && stateSlug
      ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${stateSlug}/${area.slug}/passport?ref=${business.referral_code}`
      : null;

  const [{ data: totalReferrals }, { data: statsRaw }] = await Promise.all([
    supabase.rpc("count_business_referrals", { target_business_id: businessId }),
    supabase.rpc("get_business_referral_stats", { target_business_id: businessId }),
  ]);
  const stats = statsRaw as { revenue_cents: number; payout_owed_cents: number; payout_paid_cents: number } | null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">Referral program</h2>
      <p className="mt-1 text-ink-muted">
        Share your referral link. When someone purchases a Passport through your link, your
        business earns credit.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Your referral code</h3>
        {business.referral_code ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-lg bg-surface-elevated px-4 py-2 font-mono text-lg font-semibold text-ink">
                {business.referral_code}
              </span>
            </div>
            {referralLink && (
              <p className="mt-2 break-all text-sm text-ink-muted">{referralLink}</p>
            )}
          </>
        ) : (
          <form action={generateBusinessReferralCode.bind(null, businessId)} className="mt-3">
            <button className={buttonClasses("primary")}>
              Generate a code
            </button>
          </form>
        )}

        <form action={setCustomBusinessReferralCode.bind(null, businessId)} className="mt-4 flex gap-2 border-t border-border pt-4">
          <input
            name="code"
            placeholder="custom-code"
            defaultValue={business.referral_code ?? ""}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
          <SaveButton variant="outline">Save custom code</SaveButton>
        </form>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Total referrals</p>
          <p className="mt-1 text-2xl font-bold text-ink">{totalReferrals ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Revenue generated</p>
          <p className="mt-1 text-2xl font-bold text-ink">${((stats?.revenue_cents ?? 0) / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Commission owed</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">${((stats?.payout_owed_cents ?? 0) / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Commission paid</p>
          <p className="mt-1 text-2xl font-bold text-ink">${((stats?.payout_paid_cents ?? 0) / 100).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
