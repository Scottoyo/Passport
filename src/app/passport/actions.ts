"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPassportWelcomeEmail } from "@/lib/email/send-passport-welcome";

// Placeholder "checkout." No payment processor is wired up yet — see
// docs/ARCHITECTURE.md "Open decisions before payments." This exists so the
// rest of the product (account dashboard, redemption flow, RLS on
// `passports`) can be built and tested end-to-end now, without pretending a
// real charge happened. `payment_reference` is stamped PLACEHOLDER so it's
// unmistakable in the data, and this must be replaced before taking real
// payments. `amount_paid_cents`/`referral_payout_cents` are still real
// numbers though — an internal ledger of what would be charged/owed, which
// is what promo codes and referral payout reporting are built on.
export async function startPlaceholderPassport(
  passportProductId: string,
  referralCode?: string,
  promoCode?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to sign in first." };
  }

  const { data: product } = await supabase
    .from("passport_products")
    .select("duration_days, state_id, passport_area_id, price_cents")
    .eq("id", passportProductId)
    .single();

  if (!product) {
    return { error: "That Passport product is no longer available." };
  }

  let discountCents = 0;
  let promoCodeId: string | null = null;
  if (promoCode) {
    const { data: result, error: promoError } = await supabase.rpc("validate_promo_code", {
      code: promoCode.trim().toLowerCase(),
      area_id: product.passport_area_id,
    });
    if (promoError) return { error: promoError.message };
    const outcome = result as { success: boolean; error?: string; promo_code_id?: string; discount_type?: string; discount_value?: number };
    if (!outcome.success) {
      return { error: outcome.error ?? "That promo code isn't valid." };
    }
    promoCodeId = outcome.promo_code_id ?? null;
    discountCents =
      outcome.discount_type === "percent_off"
        ? Math.round((product.price_cents * (outcome.discount_value ?? 0)) / 100)
        : (outcome.discount_value ?? 0);
    discountCents = Math.min(discountCents, product.price_cents);
  }
  const amountPaidCents = product.price_cents - discountCents;

  // A code can refer to a business or a passport holder, never both —
  // businesses checked first, then profiles via the resolve_profile_referral_code
  // RPC (a plain query can't see another user's profile row — RLS only
  // allows reading your own).
  let referredByBusinessId: string | null = null;
  let referredByProfileId: string | null = null;
  let referralPayoutCents = 0;
  if (referralCode) {
    const normalized = referralCode.trim().toLowerCase();
    const { data: referrer } = await supabase
      .from("businesses")
      .select("id, referral_payout_rate_cents, referral_suspended_at")
      .eq("referral_code", normalized)
      .maybeSingle();
    if (referrer) {
      if (!referrer.referral_suspended_at) {
        referredByBusinessId = referrer.id;
        referralPayoutCents = referrer.referral_payout_rate_cents ?? 0;
      }
    } else {
      const { data: profileId } = await supabase.rpc("resolve_profile_referral_code", { code: normalized });
      if (profileId) {
        const { data: payoutInfo } = await supabase.rpc("get_profile_referral_payout", {
          target_profile_id: profileId,
        });
        const info = payoutInfo as { payout_rate_cents: number; suspended: boolean } | null;
        // A suspended referrer's code is silently dropped rather than
        // failing the buyer's own purchase over an action taken against
        // someone else's code.
        if (info && !info.suspended) {
          referredByProfileId = profileId;
          referralPayoutCents = info.payout_rate_cents;
        }
      }
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + product.duration_days);

  const { data: newPassport, error } = await supabase
    .from("passports")
    .insert({
      owner_user_id: user.id,
      passport_product_id: passportProductId,
      state_id: product.state_id,
      passport_area_id: product.passport_area_id,
      status: "active",
      expires_at: expiresAt.toISOString(),
      payment_reference: "PLACEHOLDER-NO-PAYMENT-PROCESSOR",
      referred_by_business_id: referredByBusinessId,
      referred_by_profile_id: referredByProfileId,
      amount_paid_cents: amountPaidCents,
      promo_code_id: promoCodeId,
      discount_cents: discountCents,
      referral_payout_cents: referredByBusinessId || referredByProfileId ? referralPayoutCents : 0,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Fire-and-forget via after() (not a bare un-awaited call, which risks
  // the serverless function freezing mid-send) - a failed welcome email
  // must never fail a successful purchase, and sendPassportWelcomeEmail
  // itself never throws, but the .catch is a backstop against anything
  // upstream (e.g. a template bug) throwing synchronously.
  after(() =>
    sendPassportWelcomeEmail({
      passportId: newPassport.id,
      userId: user.id,
      recipientEmail: user.email ?? "",
      areaId: product.passport_area_id,
    }).catch((e) => console.error("passport welcome email failed", e))
  );

  revalidatePath("/account");
  return { error: null };
}
