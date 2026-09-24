"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadPassportPhoto, deletePassportPhoto, passportPhotoPathFromUrl } from "@/lib/storage";
import type { NotificationPreferences } from "@/lib/types/domain";

export type MediaActionResult = { ok: true } | { ok: false; error: string };

async function requireSelf() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");
  return { supabase, userId: user.id };
}

export async function updateMyProfile(formData: FormData) {
  const { supabase, userId } = await requireSelf();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const ageRange = String(formData.get("age_range") ?? "").trim();
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const stateCode = String(formData.get("state_code") ?? "").trim().toUpperCase();
  const postalCode = String(formData.get("postal_code") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      age_range: ageRange || null,
      address_line1: addressLine1 || null,
      city: city || null,
      state_code: stateCode || null,
      postal_code: postalCode || null,
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
  revalidatePath("/account/settings");
  revalidatePath(`/admin/passport-holders/${userId}`);
}

export async function updateMyPassportDates(passportId: string, formData: FormData) {
  const { supabase } = await requireSelf();

  const start = String(formData.get("travel_start_date") ?? "");
  const end = String(formData.get("travel_end_date") ?? "");

  const { error } = await supabase
    .from("passports")
    .update({ travel_start_date: start || null, travel_end_date: end || null })
    .eq("id", passportId);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
  revalidatePath("/account/passport");
}

export async function uploadMyPassportPhoto(
  passportId: string,
  _prevState: MediaActionResult | null,
  formData: FormData
): Promise<MediaActionResult> {
  try {
    const { supabase } = await requireSelf();
    const file = formData.get("photo") as File | null;
    if (!file || file.size === 0) throw new Error("Choose an image to upload.");

    const { data: passport } = await supabase.from("passports").select("photo_url").eq("id", passportId).maybeSingle();
    const previousUrl = passport?.photo_url ?? null;

    const { path: newPath, url } = await uploadPassportPhoto(passportId, file);
    const { error } = await supabase.from("passports").update({ photo_url: url }).eq("id", passportId);
    if (error) {
      await deletePassportPhoto(newPath).catch(() => {});
      throw new Error(error.message);
    }

    const oldPath = previousUrl ? passportPhotoPathFromUrl(previousUrl) : null;
    if (oldPath && oldPath !== newPath) {
      await deletePassportPhoto(oldPath).catch(() => {});
    }

    revalidatePath("/account/passport");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function clearMyPassportPhoto(
  passportId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _prevState: MediaActionResult | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _formData: FormData
): Promise<MediaActionResult> {
  try {
    const { supabase } = await requireSelf();
    const { data: passport } = await supabase.from("passports").select("photo_url").eq("id", passportId).maybeSingle();
    const previousUrl = passport?.photo_url ?? null;

    const { error } = await supabase.from("passports").update({ photo_url: null }).eq("id", passportId);
    if (error) throw new Error(error.message);

    const oldPath = previousUrl ? passportPhotoPathFromUrl(previousUrl) : null;
    if (oldPath) await deletePassportPhoto(oldPath).catch(() => {});

    revalidatePath("/account/passport");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Remove failed." };
  }
}

export async function updateNotificationPreferences(formData: FormData) {
  const { supabase, userId } = await requireSelf();

  const preferences: NotificationPreferences = {
    achievement_unlocked: formData.get("achievement_unlocked") === "on",
    admin_announcement: formData.get("admin_announcement") === "on",
    new_business_added: formData.get("new_business_added") === "on",
    new_promotion_added: formData.get("new_promotion_added") === "on",
  };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: preferences })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/account/settings");
  revalidatePath("/account/notifications");
}

export async function markNotificationsRead() {
  const { supabase, userId } = await requireSelf();
  const { error } = await supabase
    .from("profiles")
    .update({ notifications_last_read_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
  revalidatePath("/account/notifications");
}

export async function generateMyReferralCode() {
  const { supabase } = await requireSelf();
  const code = Math.random().toString(36).slice(2, 10);
  const { data, error } = await supabase.rpc("set_profile_referral_code", { code });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? "Couldn't generate a code.");
  revalidatePath("/account/referrals");
}

export async function setMyCustomReferralCode(formData: FormData) {
  const { supabase } = await requireSelf();
  const code = String(formData.get("code") ?? "").trim();
  const { data, error } = await supabase.rpc("set_profile_referral_code", { code });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? "Couldn't set that code.");
  revalidatePath("/account/referrals");
}
