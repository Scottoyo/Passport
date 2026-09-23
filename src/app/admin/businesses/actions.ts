"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";

// Region managers, state managers, and national admins can all approve,
// reject, and feature businesses within their own hierarchy — the same
// manage_businesses capability that already lets them edit every other
// field on the business (RLS on `businesses` — 0029 — enforces the real
// boundary regardless of what this returns).
async function requireBusinessCapability(businessId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You don't have permission to manage this business.");
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("passport_area_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) throw new Error("That business couldn't be found.");

  let stateId: string | null = null;
  if (!currentUser.isNationalAdmin) {
    const { data: area } = await supabase
      .from("passport_areas")
      .select("state_id")
      .eq("id", business.passport_area_id)
      .maybeSingle();
    stateId = area?.state_id ?? null;
  }

  if (!canManageArea(currentUser, business.passport_area_id, "manage_businesses", stateId)) {
    throw new Error("You don't have permission to manage this business.");
  }
  return { currentUser, supabase };
}

function computeFeaturedWindow(formData: FormData): { startsAt: string; endsAt: string } {
  const preset = String(formData.get("preset") ?? "");
  if (preset === "7" || preset === "30") {
    const now = new Date();
    const days = Number(preset);
    return {
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const startRaw = String(formData.get("starts_at") ?? "").trim();
  const endRaw = String(formData.get("ends_at") ?? "").trim();
  if (!startRaw || !endRaw) throw new Error("Choose a start and end date.");
  const startsAt = new Date(startRaw);
  const endsAt = new Date(endRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Enter valid dates.");
  }
  if (endsAt <= startsAt) throw new Error("The end date must be after the start date.");
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

// Feature for a fixed 7/30-day window (formData carries preset="7"|"30") or
// a custom range (preset="custom" plus starts_at/ends_at date inputs) - one
// action handles all three, since they only differ in how the window gets
// computed. Visibility on the public Home page is entirely window-driven
// (see getBusinessesForArea) - no scheduled job flips `featured` back off
// when the window passes, the read-side query just stops matching it.
export async function featureBusiness(businessId: string, formData: FormData) {
  const { supabase } = await requireBusinessCapability(businessId);
  const { startsAt, endsAt } = computeFeaturedWindow(formData);
  const { error } = await supabase
    .from("businesses")
    .update({ featured: true, featured_starts_at: startsAt, featured_ends_at: endsAt })
    .eq("id", businessId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}

export async function unfeatureBusiness(businessId: string) {
  const { supabase } = await requireBusinessCapability(businessId);
  const { error } = await supabase
    .from("businesses")
    .update({ featured: false, featured_starts_at: null, featured_ends_at: null })
    .eq("id", businessId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}

export async function setBusinessApproval(businessId: string, approvalStatus: "approved" | "rejected") {
  const { currentUser, supabase } = await requireBusinessCapability(businessId);
  const { error } = await supabase
    .from("businesses")
    .update({
      approval_status: approvalStatus,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}
