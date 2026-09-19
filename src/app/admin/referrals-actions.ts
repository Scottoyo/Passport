"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";

export type ReferralKind = "profile" | "business";

function tableFor(kind: ReferralKind) {
  return kind === "profile" ? "profiles" : "businesses";
}

function pathFor(kind: ReferralKind) {
  return kind === "profile" ? "/admin/referrals" : "/admin/business-sales";
}

// Mirrors requireHolderAccess (admin/passport-holders/[profileId]/actions.ts)
// for a profile referrer (checked via the passports they themselves own),
// and requireBusinessCapability's shape for a business referrer (checked
// directly via the business's own area).
async function requireReferrerAccess(kind: ReferralKind, referrerId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Sign in required.");
  if (currentUser.isNationalAdmin) return currentUser;

  const supabase = await createClient();
  if (kind === "business") {
    const { data: business } = await supabase
      .from("businesses")
      .select("passport_area_id")
      .eq("id", referrerId)
      .maybeSingle();
    const { data: area } = business
      ? await supabase.from("passport_areas").select("state_id").eq("id", business.passport_area_id).maybeSingle()
      : { data: null };
    if (!business || !canManageArea(currentUser, business.passport_area_id, "manage_businesses", area?.state_id ?? null)) {
      throw new Error("You don't have permission to manage this business's referral code.");
    }
  } else {
    const { data: passports } = await supabase
      .from("passports")
      .select("state_id, passport_area_id")
      .eq("owner_user_id", referrerId);
    const hasAccess = (passports ?? []).some((p) =>
      canManageArea(currentUser, p.passport_area_id as string, "view_metrics", p.state_id as string)
    );
    if (!hasAccess) throw new Error("You don't have permission to manage this passport holder's referral code.");
  }
  return currentUser;
}

export async function setReferralSuspended(kind: ReferralKind, referrerId: string, suspended: boolean) {
  await requireReferrerAccess(kind, referrerId);
  const supabase = await createClient();
  const { error } = await supabase
    .from(tableFor(kind))
    .update({ referral_suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", referrerId);
  if (error) throw new Error(error.message);
  revalidatePath(pathFor(kind));
}

export async function deleteReferralCode(kind: ReferralKind, referrerId: string) {
  await requireReferrerAccess(kind, referrerId);
  const supabase = await createClient();
  const { error } = await supabase.from(tableFor(kind)).update({ referral_code: null }).eq("id", referrerId);
  if (error) throw new Error(error.message);
  revalidatePath(pathFor(kind));
}

export async function setReferralPayoutRate(kind: ReferralKind, referrerId: string, formData: FormData) {
  await requireReferrerAccess(kind, referrerId);
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const rateCents = Math.round(Number(rateRaw) * 100);
  if (!Number.isFinite(rateCents) || rateCents < 0) throw new Error("Enter a valid dollar amount.");

  const supabase = await createClient();
  const { error } = await supabase
    .from(tableFor(kind))
    .update({ referral_payout_rate_cents: rateCents })
    .eq("id", referrerId);
  if (error) throw new Error(error.message);
  revalidatePath(pathFor(kind));
}

export async function markReferralPayoutsPaid(kind: ReferralKind, referrerId: string) {
  await requireReferrerAccess(kind, referrerId);
  const supabase = await createClient();
  const column = kind === "profile" ? "referred_by_profile_id" : "referred_by_business_id";
  const { error } = await supabase
    .from("passports")
    .update({ referral_payout_paid_at: new Date().toISOString() })
    .eq(column, referrerId)
    .is("referral_payout_paid_at", null);
  if (error) throw new Error(error.message);
  revalidatePath(pathFor(kind));
}
