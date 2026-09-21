"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasStateCapability } from "@/lib/permissions";
import type { ContentStatus } from "@/lib/types/domain";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireNationalAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can manage states and Passport Areas.");
  }
  return currentUser;
}

// National admins or a state manager with manage_subareas for this
// specific state — the state-level analog of what that capability means
// for an area manager creating subareas (creating the next level down).
async function requireStateAccess(stateId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasStateCapability(currentUser, stateId, "manage_subareas")) {
    throw new Error("You don't have permission to manage regions in this state.");
  }
  return currentUser;
}

export async function setStateStatus(stateId: string, status: ContentStatus) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("states")
    .update({
      status,
      launched_at: status === "active" ? new Date().toISOString() : undefined,
    })
    .eq("id", stateId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}

export async function updateStateDetails(stateId: string, formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const abbreviation = String(formData.get("abbreviation") ?? "").trim().toUpperCase();
  const introCopy = String(formData.get("intro_copy") ?? "").trim();

  if (!name || abbreviation.length !== 2) {
    throw new Error("A state needs a name and a 2-letter abbreviation.");
  }

  const { error } = await supabase
    .from("states")
    .update({ name, abbreviation, intro_copy: introCopy || null })
    .eq("id", stateId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}

export async function createArea(formData: FormData) {
  const stateId = String(formData.get("state_id") ?? "");
  if (!stateId) throw new Error("A Passport Area needs a state.");
  await requireStateAccess(stateId);
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const slug = slugify(name);

  if (!name) {
    throw new Error("A Passport Area needs a name.");
  }

  const { error } = await supabase
    .from("passport_areas")
    .insert({ state_id: stateId, name, slug, tagline: tagline || null });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}

export async function setAreaStatus(areaId: string, status: ContentStatus) {
  const supabase = await createClient();
  const { data: area } = await supabase
    .from("passport_areas")
    .select("state_id")
    .eq("id", areaId)
    .maybeSingle();
  if (!area) throw new Error("Passport Area not found.");
  await requireStateAccess(area.state_id);

  const { error } = await supabase
    .from("passport_areas")
    .update({
      status,
      launched_at: status === "active" ? new Date().toISOString() : undefined,
    })
    .eq("id", areaId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}

export async function addStateManager(stateId: string, formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("An email is required to assign a state manager.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) {
    throw new Error(
      `No account found for ${email} yet - ask them to sign in once first, then assign them.`
    );
  }

  const capabilities = {
    can_view_metrics: formData.get("can_view_metrics") === "on",
    can_manage_businesses: formData.get("can_manage_businesses") === "on",
    can_manage_offers: formData.get("can_manage_offers") === "on",
    can_manage_subareas: formData.get("can_manage_subareas") === "on",
    can_submit_marketing_requests: formData.get("can_submit_marketing_requests") === "on",
    can_manage_staff: formData.get("can_manage_staff") === "on",
    can_manage_leads: formData.get("can_manage_leads") === "on",
  };

  const { error } = await supabase
    .from("state_assignments")
    .upsert({ user_id: profile.id, state_id: stateId, ...capabilities }, { onConflict: "user_id,state_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}

export async function removeStateManager(assignmentId: string) {
  await requireNationalAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("state_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}
