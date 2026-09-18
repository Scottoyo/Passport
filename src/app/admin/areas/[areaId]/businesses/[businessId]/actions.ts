"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import type { ContentStatus, DiscountType } from "@/lib/types/domain";

async function requireCapability(areaId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canManageArea(currentUser, areaId, "manage_offers")) {
    throw new Error("You don't have permission to manage offers for this business.");
  }
  return currentUser;
}

export async function createOffer(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId);
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const discountType = String(formData.get("discount_type") ?? "other") as DiscountType;
  const discountValueRaw = String(formData.get("discount_value") ?? "").trim();

  if (!title) throw new Error("An offer needs a title.");

  const { error } = await supabase.from("offers").insert({
    business_id: businessId,
    title,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValueRaw ? Number(discountValueRaw) : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}/businesses/${businessId}`);
}

export async function setOfferStatus(
  areaId: string,
  businessId: string,
  offerId: string,
  status: ContentStatus
) {
  await requireCapability(areaId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update({ status, launched_at: status === "active" ? new Date().toISOString() : undefined })
    .eq("id", offerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}/businesses/${businessId}`);
}
