"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
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

export async function createState(formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const abbreviation = String(formData.get("abbreviation") ?? "").trim().toUpperCase();
  const slug = slugify(name);

  if (!name || abbreviation.length !== 2) {
    throw new Error("A state needs a name and a 2-letter abbreviation.");
  }

  const { error } = await supabase.from("states").insert({ name, slug, abbreviation });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/locations");
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

export async function createArea(formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const stateId = String(formData.get("state_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const slug = slugify(name);

  if (!stateId || !name) {
    throw new Error("A Passport Area needs a state and a name.");
  }

  const { error } = await supabase
    .from("passport_areas")
    .insert({ state_id: stateId, name, slug, tagline: tagline || null });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
}

export async function setAreaStatus(areaId: string, status: ContentStatus) {
  await requireNationalAdmin();
  const supabase = await createClient();

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
