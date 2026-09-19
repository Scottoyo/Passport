import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";
import type { Profile } from "@/lib/types/domain";
import { generateMyReferralCode, setMyCustomReferralCode } from "../actions";

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

  const { data: passportsPurchased } = await supabase.rpc("count_profile_referrals", {
    target_profile_id: user.id,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Referral Program</h1>
      <p className="mt-1 text-slate-600">Share your referral code with friends and help them get their own Passport.</p>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Your referral code</h2>
        <p className="mt-1 text-sm text-slate-500">Generate a unique referral code or create your own.</p>

        {profile?.referral_code ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-4 py-2 font-mono text-lg font-semibold text-slate-900">
                {profile.referral_code}
              </span>
            </div>
            {referralPath && <p className="mt-2 break-all text-sm text-slate-500">{referralPath}</p>}
          </>
        ) : (
          <form action={generateMyReferralCode} className="mt-3">
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Generate Code
            </button>
          </form>
        )}

        <form action={setMyCustomReferralCode} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <input
            name="code"
            placeholder="e.g. JOHN-2026"
            defaultValue={profile?.referral_code ?? ""}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            Save Custom Code
          </button>
        </form>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passports purchased</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{passportsPurchased ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue generated</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">$0.00</p>
          <p className="mt-1 text-xs text-slate-400">Payments aren&apos;t connected yet</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your code</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{profile?.referral_code ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
