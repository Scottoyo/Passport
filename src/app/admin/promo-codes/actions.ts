"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea, hasStateCapability } from "@/lib/permissions";
import type { PromoCodeStatus } from "@/lib/types/domain";

export async function createPromoCode(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Sign in required.");

  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const discountType = String(formData.get("discount_type") ?? "");
  const discountValueRaw = String(formData.get("discount_value") ?? "").trim();
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const expiresAtRaw = String(formData.get("expires_at") ?? "").trim();
  const scopeRaw = String(formData.get("scope") ?? "national");

  if (!code) throw new Error("A code is required.");
  if (discountType !== "percent_off" && discountType !== "amount_off") {
    throw new Error("Choose a discount type.");
  }
  const rawValue = Number(discountValueRaw);
  if (!Number.isFinite(rawValue) || rawValue <= 0) throw new Error("Enter a valid discount amount.");
  const discountValue = discountType === "percent_off" ? Math.round(rawValue) : Math.round(rawValue * 100);

  const supabase = await createClient();
  let scopeStateId: string | null = null;
  let scopeAreaId: string | null = null;

  if (scopeRaw === "national") {
    if (!currentUser.isNationalAdmin) throw new Error("Only national admins can create nationwide codes.");
  } else if (scopeRaw.startsWith("state:")) {
    scopeStateId = scopeRaw.slice("state:".length);
    if (!hasStateCapability(currentUser, scopeStateId, "manage_offers")) {
      throw new Error("You don't have permission to create codes for that state.");
    }
  } else if (scopeRaw.startsWith("area:")) {
    scopeAreaId = scopeRaw.slice("area:".length);
    const { data: area } = await supabase.from("passport_areas").select("state_id").eq("id", scopeAreaId).maybeSingle();
    if (!canManageArea(currentUser, scopeAreaId, "manage_offers", area?.state_id ?? null)) {
      throw new Error("You don't have permission to create codes for that region.");
    }
  } else {
    throw new Error("Invalid scope.");
  }

  const { error } = await supabase.from("promo_codes").insert({
    code,
    discount_type: discountType,
    discount_value: discountValue,
    scope_state_id: scopeStateId,
    scope_area_id: scopeAreaId,
    max_uses: maxUsesRaw ? Math.round(Number(maxUsesRaw)) : null,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
    created_by: currentUser.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/promo-codes");
}

export async function setPromoCodeStatus(promoCodeId: string, status: PromoCodeStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").update({ status }).eq("id", promoCodeId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/promo-codes");
}

export async function deletePromoCode(promoCodeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", promoCodeId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/promo-codes");
}
