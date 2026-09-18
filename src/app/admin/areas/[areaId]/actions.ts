"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import type { AreaCapability, ContentStatus } from "@/lib/types/domain";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireCapability(areaId: string, capability: AreaCapability) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You don't have permission to do that for this Passport Area.");
  }

  // canManageArea needs the area's state_id to know whether a state-level
  // manager (not just a direct area_assignments row) covers this area —
  // this check runs before any Supabase write, so a false negative here
  // would block a legitimately-permitted state manager outright.
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
    throw new Error("You don't have permission to do that for this Passport Area.");
  }
  return currentUser;
}

async function requireNationalAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can assign managers to a Passport Area.");
  }
  return currentUser;
}

export async function createSubarea(areaId: string, formData: FormData) {
  await requireCapability(areaId, "manage_subareas");
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A subarea needs a name.");

  const { error } = await supabase
    .from("subareas")
    .insert({ passport_area_id: areaId, name, slug: slugify(name) });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function setSubareaStatus(areaId: string, subareaId: string, status: ContentStatus) {
  await requireCapability(areaId, "manage_subareas");
  const supabase = await createClient();
  const { error } = await supabase
    .from("subareas")
    .update({ status, launched_at: status === "active" ? new Date().toISOString() : undefined })
    .eq("id", subareaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function createBusiness(areaId: string, formData: FormData) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const subareaId = String(formData.get("subarea_id") ?? "") || null;
  if (!name) throw new Error("A business needs a name.");

  const { error } = await supabase.from("businesses").insert({
    passport_area_id: areaId,
    subarea_id: subareaId,
    name,
    slug: slugify(name),
    city: city || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function setBusinessStatus(areaId: string, businessId: string, status: ContentStatus) {
  await requireCapability(areaId, "manage_businesses");
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ status, launched_at: status === "active" ? new Date().toISOString() : undefined })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function addStaff(areaId: string, formData: FormData) {
  await requireCapability(areaId, "manage_staff");
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const businessId = String(formData.get("business_id") ?? "") || null;
  if (!email) throw new Error("An email is required to add staff.");

  const { data: profileId } = await supabase.rpc("find_profile_id_for_staff", {
    area_id: areaId,
    lookup_email: email,
  });

  if (!profileId) {
    throw new Error(
      `No account found for ${email} yet — ask them to sign in once first, then add them.`
    );
  }

  const { error } = await supabase.from("local_staff").insert({
    passport_area_id: areaId,
    business_id: businessId,
    user_id: profileId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function removeStaff(areaId: string, staffId: string) {
  await requireCapability(areaId, "manage_staff");
  const supabase = await createClient();
  const { error } = await supabase.from("local_staff").delete().eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function addAreaManager(areaId: string, formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("An email is required to assign a manager.");

  // Caller is confirmed national admin above, so RLS ("profiles: ... or
  // is_national_admin(...)") allows reading any profile by email here.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    throw new Error(
      `No account found for ${email} yet — ask them to sign in once first, then assign them.`
    );
  }

  const capabilities = {
    can_view_metrics: formData.get("can_view_metrics") === "on",
    can_manage_businesses: formData.get("can_manage_businesses") === "on",
    can_manage_offers: formData.get("can_manage_offers") === "on",
    can_manage_subareas: formData.get("can_manage_subareas") === "on",
    can_submit_marketing_requests: formData.get("can_submit_marketing_requests") === "on",
    can_manage_staff: formData.get("can_manage_staff") === "on",
  };

  const { error } = await supabase
    .from("area_assignments")
    .upsert(
      { user_id: profile.id, passport_area_id: areaId, ...capabilities },
      { onConflict: "user_id,passport_area_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function removeAreaManager(areaId: string, assignmentId: string) {
  await requireNationalAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("area_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}

export async function createMarketingRequest(areaId: string, formData: FormData) {
  const currentUser = await requireCapability(areaId, "submit_marketing_requests");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  if (!title) throw new Error("A marketing request needs a title.");

  const { error } = await supabase.from("marketing_requests").insert({
    passport_area_id: areaId,
    requested_by: currentUser.id,
    title,
    details: details || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
}
