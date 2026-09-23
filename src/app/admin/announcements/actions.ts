"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea, hasStateCapability } from "@/lib/permissions";

export async function createAnnouncement(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Sign in required.");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const scopeRaw = String(formData.get("scope") ?? "national");

  if (!title) throw new Error("A title is required.");
  if (!body) throw new Error("A message is required.");

  const supabase = await createClient();
  let scopeStateId: string | null = null;
  let scopeAreaId: string | null = null;

  if (scopeRaw === "national") {
    if (!currentUser.isNationalAdmin) throw new Error("Only national admins can send nationwide announcements.");
  } else if (scopeRaw.startsWith("state:")) {
    scopeStateId = scopeRaw.slice("state:".length);
    if (!hasStateCapability(currentUser, scopeStateId, "manage_announcements")) {
      throw new Error("You don't have permission to send announcements for that state.");
    }
  } else if (scopeRaw.startsWith("area:")) {
    scopeAreaId = scopeRaw.slice("area:".length);
    const { data: area } = await supabase.from("passport_areas").select("state_id").eq("id", scopeAreaId).maybeSingle();
    if (!canManageArea(currentUser, scopeAreaId, "manage_announcements", area?.state_id ?? null)) {
      throw new Error("You don't have permission to send announcements for that region.");
    }
  } else {
    throw new Error("Invalid scope.");
  }

  const { error } = await supabase.from("admin_announcements").insert({
    title,
    body,
    scope_state_id: scopeStateId,
    scope_area_id: scopeAreaId,
    created_by: currentUser.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/announcements");
}
