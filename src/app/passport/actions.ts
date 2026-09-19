"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Placeholder "checkout." No payment processor is wired up yet — see
// docs/ARCHITECTURE.md "Open decisions before payments." This exists so the
// rest of the product (account dashboard, redemption flow, RLS on
// `passports`) can be built and tested end-to-end now, without pretending a
// real charge happened. `payment_reference` is stamped PLACEHOLDER so it's
// unmistakable in the data, and this must be replaced before taking real
// payments.
export async function startPlaceholderPassport(passportProductId: string, referralCode?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to sign in first." };
  }

  const { data: product } = await supabase
    .from("passport_products")
    .select("duration_days, state_id, passport_area_id")
    .eq("id", passportProductId)
    .single();

  if (!product) {
    return { error: "That Passport product is no longer available." };
  }

  let referredByBusinessId: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from("businesses")
      .select("id")
      .eq("referral_code", referralCode.trim().toLowerCase())
      .maybeSingle();
    referredByBusinessId = referrer?.id ?? null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + product.duration_days);

  const { error } = await supabase.from("passports").insert({
    owner_user_id: user.id,
    passport_product_id: passportProductId,
    state_id: product.state_id,
    passport_area_id: product.passport_area_id,
    status: "active",
    expires_at: expiresAt.toISOString(),
    payment_reference: "PLACEHOLDER-NO-PAYMENT-PROCESSOR",
    referred_by_business_id: referredByBusinessId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { error: null };
}
