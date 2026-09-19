"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requirePortalAccess(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to sign in.");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, created_by, passport_area_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) throw new Error("Business not found.");

  if (business.created_by === user.id) return { user, business, isOwner: true };

  const { data: staffRow } = await supabase
    .from("local_staff")
    .select("id")
    .eq("user_id", user.id)
    .or(`business_id.eq.${businessId},business_id.is.null`)
    .maybeSingle();
  if (!staffRow) throw new Error("You don't have access to this business.");
  return { user, business, isOwner: false };
}

export async function createBusinessMarketingRequest(
  businessId: string,
  serviceType: string,
  formData: FormData
) {
  const { user, business } = await requirePortalAccess(businessId);
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim() || serviceType;
  const details = String(formData.get("details") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();

  if (!details) throw new Error("Please describe what you're looking for.");

  const detailParts = [
    `Service: ${serviceType}`,
    details,
    startDate || endDate ? `Preferred dates: ${startDate || "?"} – ${endDate || "?"}` : null,
    contactName ? `Contact: ${contactName}` : null,
    contactEmail ? `Contact email: ${contactEmail}` : null,
    contactPhone ? `Contact phone: ${contactPhone}` : null,
  ].filter(Boolean);

  const { error } = await supabase.from("marketing_requests").insert({
    passport_area_id: business.passport_area_id,
    business_id: businessId,
    requested_by: user.id,
    title,
    details: detailParts.join("\n"),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/${businessId}/marketing`);
}

export async function generateBusinessReferralCode(businessId: string) {
  const supabase = await createClient();
  const code = Math.random().toString(36).slice(2, 10);
  const { data, error } = await supabase.rpc("set_business_referral_code", {
    target_business_id: businessId,
    code,
  });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? "Couldn't generate a code.");
  revalidatePath(`/portal/${businessId}/referrals`);
}

export async function setCustomBusinessReferralCode(businessId: string, formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim();
  const { data, error } = await supabase.rpc("set_business_referral_code", {
    target_business_id: businessId,
    code,
  });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? "Couldn't set that code.");
  revalidatePath(`/portal/${businessId}/referrals`);
}

export async function portalAddStaff(businessId: string, formData: FormData) {
  const { business, isOwner } = await requirePortalAccess(businessId);
  if (!isOwner) throw new Error("Only the business owner can manage staff.");
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("An email is required to add staff.");

  const { data: profileId } = await supabase.rpc("find_profile_id_for_business_owner", {
    business_id: businessId,
    lookup_email: email,
  });
  if (!profileId) {
    throw new Error(`No account found for ${email} yet - ask them to sign in once first, then add them.`);
  }

  const { error } = await supabase.from("local_staff").insert({
    passport_area_id: business.passport_area_id,
    business_id: businessId,
    user_id: profileId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/${businessId}/staff`);
}

export async function portalRemoveStaff(businessId: string, staffId: string) {
  const { isOwner } = await requirePortalAccess(businessId);
  if (!isOwner) throw new Error("Only the business owner can manage staff.");
  const supabase = await createClient();
  const { error } = await supabase.from("local_staff").delete().eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/${businessId}/staff`);
}
