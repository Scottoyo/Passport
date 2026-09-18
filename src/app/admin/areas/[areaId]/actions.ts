"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea, isStateManager } from "@/lib/permissions";
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

// National admin, or a state manager for this area's state (any
// capability) — the actual ceiling on which capabilities they can grant is
// enforced by RLS on area_assignments (0013_state_manager_self_service.sql),
// not here.
async function requireAreaUserManagement(areaId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You don't have permission to manage this Passport Area's managers.");
  }
  if (currentUser.isNationalAdmin) {
    return { currentUser, stateId: null as string | null };
  }

  const supabase = await createClient();
  const { data: area } = await supabase
    .from("passport_areas")
    .select("state_id")
    .eq("id", areaId)
    .maybeSingle();

  if (!area || !isStateManager(currentUser, area.state_id)) {
    throw new Error("You don't have permission to manage this Passport Area's managers.");
  }
  return { currentUser, stateId: area.state_id };
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
  const { currentUser, stateId } = await requireAreaUserManagement(areaId);
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("An email is required to assign a manager.");

  let profileId: string | null;
  if (currentUser.isNationalAdmin) {
    // RLS ("profiles: ... or is_national_admin(...)") allows reading any
    // profile by email for a national admin.
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    profileId = profile?.id ?? null;
  } else {
    // A state manager can't read the profiles table directly — this RPC is
    // a narrow, security-definer lookup scoped to their own state standing
    // (see find_profile_id_for_area_manager in 0013).
    const { data } = await supabase.rpc("find_profile_id_for_area_manager", {
      target_state_id: stateId,
      lookup_email: email,
    });
    profileId = (data as string | null) ?? null;
  }

  if (!profileId) {
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

  // If the caller is a state manager granting more than their own
  // capabilities, this insert is rejected by RLS (the real enforcement),
  // not just the disabled checkboxes in the UI.
  const { error } = await supabase
    .from("area_assignments")
    .upsert(
      { user_id: profileId, passport_area_id: areaId, ...capabilities },
      { onConflict: "user_id,passport_area_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
  revalidatePath("/admin/locations");
}

export async function removeAreaManager(areaId: string, assignmentId: string) {
  await requireAreaUserManagement(areaId);
  const supabase = await createClient();
  const { error } = await supabase.from("area_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/areas/${areaId}`);
  revalidatePath("/admin/locations");
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
