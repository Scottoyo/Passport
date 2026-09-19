import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { generateBusinessReferralCode, setCustomBusinessReferralCode } from "../actions";

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

  const { data: totalReferrals } = await supabase.rpc("count_business_referrals", {
    target_business_id: businessId,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Referral program</h2>
      <p className="mt-1 text-slate-600">
        Share your referral link. When someone purchases a Passport through your link, your
        business earns credit.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900">Your referral code</h3>
        {business.referral_code ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-4 py-2 font-mono text-lg font-semibold text-slate-900">
                {business.referral_code}
              </span>
            </div>
            {referralLink && (
              <p className="mt-2 break-all text-sm text-slate-500">{referralLink}</p>
            )}
          </>
        ) : (
          <form action={generateBusinessReferralCode.bind(null, businessId)} className="mt-3">
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Generate a code
            </button>
          </form>
        )}

        <form action={setCustomBusinessReferralCode.bind(null, businessId)} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <input
            name="code"
            placeholder="custom-code"
            defaultValue={business.referral_code ?? ""}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            Save custom code
          </button>
        </form>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total referrals</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalReferrals ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue generated</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">$0.00</p>
          <p className="mt-1 text-xs text-slate-400">Payments aren&apos;t connected yet</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commission balance</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">$0.00</p>
          <p className="mt-1 text-xs text-slate-400">Payments aren&apos;t connected yet</p>
        </div>
      </div>
    </div>
  );
}
