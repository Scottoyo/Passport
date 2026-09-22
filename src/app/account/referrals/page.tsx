import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";
import type { Profile } from "@/lib/types/domain";
import { generateMyReferralCode, setMyCustomReferralCode } from "../actions";
import { buttonClasses } from "@/lib/ui-classes";

export default async function AccountReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/referrals");

  const [{ data: profile }, passports] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    getMyPassports(user.id),
  ]);

  let referralPath: string | null = null;
  if (profile?.referral_code && passports.length > 0) {
    const { data: area } = await supabase
      .from("passport_areas")
      .select("slug, state_id")
      .eq("id", passports[0].passport_area_id)
      .maybeSingle();
    if (area) {
      const { data: state } = await supabase.from("states").select("slug").eq("id", area.state_id).maybeSingle();
      if (state) referralPath = `/${state.slug}/${area.slug}/passport?ref=${profile.referral_code}`;
    }
  }

  const [{ data: passportsPurchased }, { data: statsRaw }] = await Promise.all([
    supabase.rpc("count_profile_referrals", { target_profile_id: user.id }),
    supabase.rpc("get_my_referral_stats"),
  ]);
  const stats = statsRaw as { revenue_cents: number; payout_owed_cents: number; payout_paid_cents: number } | null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Referral Program</h1>
      <p className="mt-1 text-ink-muted">Share your referral code with friends and help them get their own Passport.</p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-ink">Your referral code</h2>
        <p className="mt-1 text-sm text-ink-muted">Generate a unique referral code or create your own.</p>

        {profile?.referral_code ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-lg bg-surface-elevated px-4 py-2 font-mono text-lg font-semibold text-ink">
                {profile.referral_code}
              </span>
            </div>
            {referralPath && <p className="mt-2 break-all text-sm text-ink-muted">{referralPath}</p>}
          </>
        ) : (
          <form action={generateMyReferralCode} className="mt-3">
            <button className={buttonClasses("primary")}>
              Generate Code
            </button>
          </form>
        )}

        <form action={setMyCustomReferralCode} className="mt-4 flex gap-2 border-t border-border pt-4">
          <input
            name="code"
            placeholder="e.g. JOHN-2026"
            defaultValue={profile?.referral_code ?? ""}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button className={buttonClasses("outline")}>
            Save Custom Code
          </button>
        </form>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Passports purchased</p>
          <p className="mt-1 text-2xl font-bold text-ink">{passportsPurchased ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Revenue generated</p>
          <p className="mt-1 text-2xl font-bold text-ink">${((stats?.revenue_cents ?? 0) / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Your code</p>
          <p className="mt-1 text-lg font-bold text-ink">{profile?.referral_code ?? "-"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
