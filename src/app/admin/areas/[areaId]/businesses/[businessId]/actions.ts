"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import { uploadBusinessMedia, deleteBusinessMedia, businessMediaPathFromUrl } from "@/lib/storage";
import type { AreaCapability, BusinessHoursDay, ContentStatus, DiscountType } from "@/lib/types/domain";

export type MediaActionResult = { ok: true } | { ok: false; error: string };

// Passes for an area/state manager with the given capability (unchanged
// behavior for the admin panel), OR for this specific business's owner/staff
// (the self-service portal) — regardless of which surface called it, RLS
// (0032) is the real boundary: an owner/staff caller can never touch the
// manager-only fields (status/approval/featured/region/redemption code)
// even if they somehow reach one of these actions, since guard_business_owner_fields
// rejects that at the database layer.
async function requireCapability(areaId: string, businessId: string, capability: AreaCapability) {
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

  if (canManageArea(currentUser, areaId, capability, stateId)) {
    return currentUser;
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("created_by")
    .eq("id", businessId)
    .maybeSingle();
  if (business?.created_by === currentUser.id) return currentUser;

  const { data: staffRow } = await supabase
    .from("local_staff")
    .select("id")
    .eq("user_id", currentUser.id)
    .or(`business_id.eq.${businessId},business_id.is.null`)
    .maybeSingle();
  if (staffRow) return currentUser;

  throw new Error("You don't have permission to manage this business.");
}

function path(areaId: string, businessId: string) {
  return `/admin/areas/${areaId}/businesses/${businessId}`;
}

export async function setBusinessActiveStatus(areaId: string, businessId: string, active: boolean) {
  await requireCapability(areaId, businessId, "manage_businesses");
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      status: active ? "active" : "paused",
      launched_at: active ? new Date().toISOString() : undefined,
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function updateBusinessBasicInfo(areaId: string, businessId: string, formData: FormData) {
  await requireCapability(areaId, businessId, "manage_businesses");
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
  await requireCapability(areaId, businessId, "manage_businesses");
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
  await requireCapability(areaId, businessId, "manage_businesses");
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
  await requireCapability(areaId, businessId, "manage_businesses");
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

// Logo/cover share this flow: upload the new file, save it on the business
// row, and only clean up the OLD Storage object once that save succeeds -
// and if the save fails, delete the just-uploaded new file instead of
// leaving an orphan either way. Needed because upsert:true on the fixed
// "{businessId}/{kind}.{ext}" path only overwrites in place when the
// extension doesn't change; a different extension (e.g. .jpg -> .png)
// would otherwise leave the old object behind forever.
async function replaceBusinessImage(
  businessId: string,
  kind: "logo" | "cover",
  field: "logo_url" | "hero_image_url",
  file: File,
  previousUrl: string | null
) {
  const { path: newPath, url } = await uploadBusinessMedia(businessId, kind, file);
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ [field]: url }).eq("id", businessId);
  if (error) {
    await deleteBusinessMedia(newPath).catch(() => {});
    throw new Error(error.message);
  }
  const oldPath = previousUrl ? businessMediaPathFromUrl(previousUrl) : null;
  if (oldPath && oldPath !== newPath) {
    await deleteBusinessMedia(oldPath).catch(() => {});
  }
}

async function clearBusinessImage(businessId: string, field: "logo_url" | "hero_image_url", previousUrl: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ [field]: null }).eq("id", businessId);
  if (error) throw new Error(error.message);
  const oldPath = previousUrl ? businessMediaPathFromUrl(previousUrl) : null;
  if (oldPath) await deleteBusinessMedia(oldPath).catch(() => {});
}

export async function uploadBusinessLogo(
  areaId: string,
  businessId: string,
  _prevState: MediaActionResult | null,
  formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) throw new Error("Choose an image to upload.");
    const supabase = await createClient();
    const { data: business } = await supabase.from("businesses").select("logo_url").eq("id", businessId).maybeSingle();
    await replaceBusinessImage(businessId, "logo", "logo_url", file, business?.logo_url ?? null);
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function uploadBusinessCover(
  areaId: string,
  businessId: string,
  _prevState: MediaActionResult | null,
  formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const file = formData.get("cover") as File | null;
    if (!file || file.size === 0) throw new Error("Choose an image to upload.");
    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("hero_image_url")
      .eq("id", businessId)
      .maybeSingle();
    await replaceBusinessImage(businessId, "cover", "hero_image_url", file, business?.hero_image_url ?? null);
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function clearBusinessLogo(
  areaId: string,
  businessId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _prevState: MediaActionResult | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const supabase = await createClient();
    const { data: business } = await supabase.from("businesses").select("logo_url").eq("id", businessId).maybeSingle();
    await clearBusinessImage(businessId, "logo_url", business?.logo_url ?? null);
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Remove failed." };
  }
}

export async function clearBusinessCover(
  areaId: string,
  businessId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _prevState: MediaActionResult | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("hero_image_url")
      .eq("id", businessId)
      .maybeSingle();
    await clearBusinessImage(businessId, "hero_image_url", business?.hero_image_url ?? null);
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Remove failed." };
  }
}

export async function addBusinessGalleryImage(
  areaId: string,
  businessId: string,
  _prevState: MediaActionResult | null,
  formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const file = formData.get("gallery") as File | null;
    if (!file || file.size === 0) throw new Error("Choose an image to upload.");
    const altText = String(formData.get("alt_text") ?? "").trim();

    const { path: storagePath, url } = await uploadBusinessMedia(businessId, "gallery", file);
    const supabase = await createClient();

    const { data: maxOrderRow } = await supabase
      .from("business_media")
      .select("display_order")
      .eq("business_id", businessId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxOrderRow?.display_order ?? -1) + 1;

    const { error } = await supabase.from("business_media").insert({
      business_id: businessId,
      storage_path: storagePath,
      url,
      alt_text: altText || null,
      display_order: nextOrder,
    });
    if (error) {
      await deleteBusinessMedia(storagePath).catch(() => {});
      throw new Error(error.message);
    }
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeBusinessGalleryImage(
  areaId: string,
  businessId: string,
  mediaId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _prevState: MediaActionResult | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const supabase = await createClient();
    const { data: media } = await supabase
      .from("business_media")
      .select("storage_path")
      .eq("id", mediaId)
      .maybeSingle();

    const { error } = await supabase.from("business_media").delete().eq("id", mediaId);
    if (error) throw new Error(error.message);
    if (media?.storage_path) await deleteBusinessMedia(media.storage_path).catch(() => {});
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Remove failed." };
  }
}

export async function updateBusinessGalleryImageAlt(
  areaId: string,
  businessId: string,
  mediaId: string,
  _prevState: MediaActionResult | null,
  formData: FormData
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const altText = String(formData.get("alt_text") ?? "").trim();
    const supabase = await createClient();
    const { error } = await supabase
      .from("business_media")
      .update({ alt_text: altText || null })
      .eq("id", mediaId);
    if (error) throw new Error(error.message);
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function reorderBusinessGalleryImages(
  areaId: string,
  businessId: string,
  orderedMediaIds: string[]
): Promise<MediaActionResult> {
  try {
    await requireCapability(areaId, businessId, "manage_businesses");
    const supabase = await createClient();
    await Promise.all(
      orderedMediaIds.map((id, index) =>
        supabase.from("business_media").update({ display_order: index }).eq("id", id)
      )
    );
    revalidatePath(path(areaId, businessId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Reorder failed." };
  }
}

function generateRedemptionCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function regenerateRedemptionCode(areaId: string, businessId: string) {
  await requireCapability(areaId, businessId, "manage_businesses");
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
  await requireCapability(areaId, businessId, "manage_offers");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const terms = String(formData.get("terms") ?? "").trim();
  const discountType = String(formData.get("discount_type") ?? "other") as DiscountType;
  const discountValueRaw = String(formData.get("discount_value") ?? "").trim();
  const redemptionInstructions = String(formData.get("redemption_instructions") ?? "").trim();
  const unlimited = formData.get("unlimited_redemptions") === "on";
  const redemptionsPerPassportRaw = String(formData.get("redemptions_per_passport") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();

  if (!title) throw new Error("An offer needs a title.");

  const { error } = await supabase.from("offers").insert({
    business_id: businessId,
    title,
    description: description || null,
    terms: terms || null,
    discount_type: discountType,
    discount_value: discountValueRaw ? Number(discountValueRaw) : null,
    redemption_instructions: redemptionInstructions || null,
    redemptions_per_passport: unlimited
      ? null
      : redemptionsPerPassportRaw
        ? Number(redemptionsPerPassportRaw)
        : 1,
    starts_at: startsAt ? new Date(startsAt).toISOString() : null,
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function updateOffer(
  areaId: string,
  businessId: string,
  offerId: string,
  formData: FormData
) {
  await requireCapability(areaId, businessId, "manage_offers");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const terms = String(formData.get("terms") ?? "").trim();
  const discountType = String(formData.get("discount_type") ?? "other") as DiscountType;
  const discountValueRaw = String(formData.get("discount_value") ?? "").trim();
  const redemptionInstructions = String(formData.get("redemption_instructions") ?? "").trim();
  const unlimited = formData.get("unlimited_redemptions") === "on";
  const redemptionsPerPassportRaw = String(formData.get("redemptions_per_passport") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();

  if (!title) throw new Error("An offer needs a title.");

  const { error } = await supabase
    .from("offers")
    .update({
      title,
      description: description || null,
      terms: terms || null,
      discount_type: discountType,
      discount_value: discountValueRaw ? Number(discountValueRaw) : null,
      redemption_instructions: redemptionInstructions || null,
      redemptions_per_passport: unlimited
        ? null
        : redemptionsPerPassportRaw
          ? Number(redemptionsPerPassportRaw)
          : 1,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    })
    .eq("id", offerId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}

export async function setOfferStatus(
  areaId: string,
  businessId: string,
  offerId: string,
  status: ContentStatus
) {
  await requireCapability(areaId, businessId, "manage_offers");
  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update({ status, launched_at: status === "active" ? new Date().toISOString() : undefined })
    .eq("id", offerId);
  if (error) throw new Error(error.message);
  revalidatePath(path(areaId, businessId));
}
