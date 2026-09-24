"use server";

import { createClient } from "@/lib/supabase/server";
import { getRedeemableOffersForPassport, type RedeemableOffer } from "@/lib/portal-queries";

interface LookupResult {
  error: string | null;
  passportId?: string;
  status?: "active" | "expired" | "revoked";
  holderFirstName?: string;
  eligible?: boolean;
  ineligibleReason?: "wrong_region" | "expired" | "revoked" | null;
}

export async function lookupPassport(businessId: string, passportNumber: string): Promise<LookupResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_passport_for_manual_redemption", {
    target_business_id: businessId,
    submitted_passport_number: passportNumber,
  });
  if (error) return { error: error.message };
  const result = data as {
    success: boolean;
    error?: string;
    passport_id?: string;
    status?: "active" | "expired" | "revoked";
    holder_first_name?: string;
    eligible?: boolean;
    ineligible_reason?: "wrong_region" | "expired" | "revoked" | null;
  };
  if (!result.success) return { error: result.error ?? "That Passport couldn't be found." };
  return {
    error: null,
    passportId: result.passport_id,
    status: result.status,
    holderFirstName: result.holder_first_name,
    eligible: result.eligible,
    ineligibleReason: result.ineligible_reason,
  };
}

export async function fetchRedeemableOffers(businessId: string, passportId: string): Promise<RedeemableOffer[]> {
  return getRedeemableOffersForPassport(businessId, passportId);
}

export async function confirmManualRedemption(
  businessId: string,
  passportNumber: string,
  offerId: string,
  holderAuthorized: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_manual_redemption", {
    target_business_id: businessId,
    submitted_passport_number: passportNumber,
    target_offer_id: offerId,
    holder_authorized: holderAuthorized,
  });
  if (error) return { error: error.message };
  const result = data as { success: boolean; error?: string };
  if (!result.success) return { error: result.error ?? "Redemption failed." };
  return { error: null };
}
