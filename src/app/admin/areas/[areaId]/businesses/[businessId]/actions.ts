"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import { uploadBusinessMedia } from "@/lib/storage";
import type { AreaCapability, BusinessHoursDay, ContentStatus, DiscountType } from "@/lib/types/domain";

async function requireCapability(areaId: string, capability: AreaCapability) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You don't have permission to manage this business.");

  let stateId: string | null = null;
  if (!currentUser.isNationalAdmin) {
    const supabase = await createClient();
    const { data: area } = await supabase
      .from("passport_areas")
      .select("state_id")
      .eq("id", areaId)
      .maybeSingle();
    stateId = area?.state_id ?? null;
  }

  if (!canManageArea(currentUser, areaId, capability, stateId)) {
    throw new Error("You don't have permission to manage this business.");
  }
  return currentUser;
}

function path(areaId: string, businessId: string) {
  return `/admin/areas/${areaId}/businesses/${businessId}`;
}

export async function updateBusinessBasicInfo(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("A business needs a name.");

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      category_id: categoryId,
      short_description: shortDescription || null,
      description: description || null,
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function updateBusinessLocationContact(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();

  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const addressLine2 = String(formData.get("address_line2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const stateCode = String(formData.get("state_code") ?? "").trim().toUpperCase();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const websiteUrl = String(formData.get("website_url") ?? "").trim();
  const newAreaId = String(formData.get("area_id") ?? "") || areaId;

  const { error } = await supabase
    .from("businesses")
    .update({
      passport_area_id: newAreaId,
      address_line1: addressLine1 || null,
      address_line2: addressLine2 || null,
      city: city || null,
      state_code: stateCode || null,
      postal_code: postalCode || null,
      phone: phone || null,
      email: email || null,
      website_url: websiteUrl || null,
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);

  if (newAreaId !== areaId) {
    redirect(`/admin/areas/${newAreaId}/businesses/${businessId}?mode=edit`);
  }
  revalidatePath(path(areaId, businessId));
}

export async function updateBusinessSocialLinks(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();

  const fields = [
    "facebook_url",
    "instagram_url",
    "tiktok_url",
    "youtube_url",
    "twitter_url",
    "linkedin_url",
  ] as const;
  const update: Record<string, string | null> = {};
  for (const field of fields) {
    update[field] = String(formData.get(field) ?? "").trim() || null;
  }

  const { error } = await supabase.from("businesses").update(update).eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

const DAYS: BusinessHoursDay["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function updateBusinessHours(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();

  const businessHours: BusinessHoursDay[] = DAYS.map((day) => {
    const isOpen = formData.get(`is_open_${day}`) === "on";
    const opensAt = String(formData.get(`opens_at_${day}`) ?? "").trim();
    const closesAt = String(formData.get(`closes_at_${day}`) ?? "").trim();
    return {
      day,
      is_open: isOpen,
      opens_at: isOpen && opensAt ? opensAt : null,
      closes_at: isOpen && closesAt ? closesAt : null,
    };
  });

  const { error } = await supabase
    .from("businesses")
    .update({
      business_hours: businessHours,
      weather_permitting: formData.get("weather_permitting") === "on",
      call_for_appointment: formData.get("call_for_appointment") === "on",
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function uploadBusinessLogo(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("Choose an image to upload.");

  const url = await uploadBusinessMedia(businessId, "logo", file);
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ logo_url: url }).eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function uploadBusinessCover(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const file = formData.get("cover") as File | null;
  if (!file || file.size === 0) throw new Error("Choose an image to upload.");

  const url = await uploadBusinessMedia(businessId, "cover", file);
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ hero_image_url: url }).eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function addBusinessGalleryImage(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const file = formData.get("gallery") as File | null;
  if (!file || file.size === 0) throw new Error("Choose an image to upload.");

  const url = await uploadBusinessMedia(businessId, "gallery", file);
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("gallery_image_urls")
    .eq("id", businessId)
    .maybeSingle();
  const current = (business?.gallery_image_urls as string[] | null) ?? [];

  const { error } = await supabase
    .from("businesses")
    .update({ gallery_image_urls: [...current, url] })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function removeBusinessGalleryImage(areaId: string, businessId: string, imageUrl: string) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("gallery_image_urls")
    .eq("id", businessId)
    .maybeSingle();
  const current = (business?.gallery_image_urls as string[] | null) ?? [];

  const { error } = await supabase
    .from("businesses")
    .update({ gallery_image_urls: current.filter((url) => url !== imageUrl) })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

function generateRedemptionCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function regenerateRedemptionCode(areaId: string, businessId: string) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      redemption_code: generateRedemptionCode(),
      redemption_code_updated_at: new Date().toISOString(),
      redemption_failed_attempts: 0,
      redemption_locked_at: null,
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function createOffer(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, "manage_offers");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const discountType = String(formData.get("discount_type") ?? "other") as DiscountType;
  const discountValueRaw = String(formData.get("discount_value") ?? "").trim();
  const redemptionInstructions = String(formData.get("redemption_instructions") ?? "").trim();
  const unlimited = formData.get("unlimited_redemptions") === "on";
  const redemptionsPerPassportRaw = String(formData.get("redemptions_per_passport") ?? "").trim();

  if (!title) throw new Error("An offer needs a title.");

  const { error } = await supabase.from("offers").insert({
    business_id: businessId,
    title,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValueRaw ? Number(discountValueRaw) : null,
    redemption_instructions: redemptionInstructions || null,
    redemptions_per_passport: unlimited
      ? null
      : redemptionsPerPassportRaw
        ? Number(redemptionsPerPassportRaw)
        : 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function setOfferStatus(
  areaId: string,
  businessId: string,
  offerId: string,
  status: ContentStatus
) {
  await requireCapability(areaId, "manage_offers");
  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update({ status, launched_at: status === "active" ? new Date().toISOString() : undefined })
    .eq("id", offerId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}
