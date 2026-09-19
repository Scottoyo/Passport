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

export async function setBusinessFeatured(businessId: string, featured: boolean) {
  const { supabase } = await requireBusinessCapability(businessId);
  const { error } = await supabase.from("businesses").update({ featured }).eq("id", businessId);
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
