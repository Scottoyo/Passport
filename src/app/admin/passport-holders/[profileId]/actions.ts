"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasStateCapability } from "@/lib/permissions";
import type { PassportStatus } from "@/lib/types/domain";

// Mirrors requireStateAccess in admin/locations/actions.ts: national admin,
// or a state manager with view_metrics for a state this holder has a
// passport in (the same reach the RLS policies from migration 0018/0019
// grant — this is UX, RLS is the real gate).
async function requireHolderAccess(profileId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Sign in required.");
  if (currentUser.isNationalAdmin) return currentUser;

  const supabase = await createClient();
  const { data: passports } = await supabase
    .from("passports")
    .select("state_id")
    .eq("owner_user_id", profileId);
  const hasAccess = (passports ?? []).some((p) =>
    hasStateCapability(currentUser, p.state_id as string, "view_metrics")
  );
  if (!hasAccess) throw new Error("You don't have permission to manage this passport holder.");
  return currentUser;
}

async function requireNationalAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can do this.");
  }
  return currentUser;
}

function revalidateHolder(profileId: string) {
  revalidatePath(`/admin/passport-holders/${profileId}`);
  revalidatePath("/admin/passport-holders");
  revalidatePath("/account");
}

export async function updateHolderProfile(profileId: string, formData: FormData) {
  await requireHolderAccess(profileId);
  const supabase = await createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const ageRange = String(formData.get("age_range") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      age_range: ageRange || null,
    })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  revalidateHolder(profileId);
}

export async function updatePassportStatus(passportId: string, profileId: string, formData: FormData) {
  await requireHolderAccess(profileId);
  const supabase = await createClient();
  const status = String(formData.get("status") ?? "") as PassportStatus;

  const { error } = await supabase.from("passports").update({ status }).eq("id", passportId);
  if (error) throw new Error(error.message);

  revalidateHolder(profileId);
}

export async function updatePassportExpiry(passportId: string, profileId: string, formData: FormData) {
  await requireHolderAccess(profileId);
  const supabase = await createClient();
  const expiresOn = String(formData.get("expires_at") ?? "");
  if (!expiresOn) throw new Error("An end date is required.");

  const { error } = await supabase
    .from("passports")
    .update({ expires_at: new Date(`${expiresOn}T00:00:00Z`).toISOString() })
    .eq("id", passportId);
  if (error) throw new Error(error.message);

  revalidateHolder(profileId);
}

export async function updatePassportTravelDates(passportId: string, profileId: string, formData: FormData) {
  await requireHolderAccess(profileId);
  const supabase = await createClient();
  const start = String(formData.get("travel_start_date") ?? "");
  const end = String(formData.get("travel_end_date") ?? "");

  const { error } = await supabase
    .from("passports")
    .update({ travel_start_date: start || null, travel_end_date: end || null })
    .eq("id", passportId);
  if (error) throw new Error(error.message);

  revalidateHolder(profileId);
}

export async function reassignPassportState(passportId: string, profileId: string, formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();
  const passportProductId = String(formData.get("passport_product_id") ?? "");
  if (!passportProductId) throw new Error("Choose a region's Passport product to reassign to.");

  const { data: product, error: productError } = await supabase
    .from("passport_products")
    .select("state_id, passport_area_id")
    .eq("id", passportProductId)
    .maybeSingle();
  if (productError || !product) throw new Error("That Passport product couldn't be found.");

  const { error } = await supabase
    .from("passports")
    .update({
      passport_product_id: passportProductId,
      state_id: product.state_id,
      passport_area_id: product.passport_area_id,
    })
    .eq("id", passportId);
  if (error) throw new Error(error.message);

  revalidateHolder(profileId);
}

export async function suspendHolder(profileId: string) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ suspended_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, { ban_duration: "876000h" });

  revalidateHolder(profileId);
}

export async function reactivateHolder(profileId: string) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ suspended_at: null }).eq("id", profileId);
  if (error) throw new Error(error.message);

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, { ban_duration: "none" });

  revalidateHolder(profileId);
}

export async function softDeleteHolder(profileId: string) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, { ban_duration: "876000h" });

  revalidateHolder(profileId);
}

export async function restoreHolder(profileId: string) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ deleted_at: null }).eq("id", profileId);
  if (error) throw new Error(error.message);

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, { ban_duration: "none" });

  revalidateHolder(profileId);
}

export async function sendHolderPasswordReset(profileId: string, email: string) {
  await requireHolderAccess(profileId);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}
