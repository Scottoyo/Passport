"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";

// Mirrors requireBusinessCapability in admin/businesses/actions.ts — region
// managers, state managers, and national admins with manage_offers can all
// feature offers within their own hierarchy (RLS on `offers` — 0028 —
// already grants this; this app-layer check was stricter than RLS for no
// stated reason).
async function requireOfferCapability(offerId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You don't have permission to manage this offer.");
  }

  const supabase = await createClient();
  const { data: offer } = await supabase.from("offers").select("business_id").eq("id", offerId).maybeSingle();
  if (!offer) throw new Error("That offer couldn't be found.");

  const { data: business } = await supabase
    .from("businesses")
    .select("passport_area_id")
    .eq("id", offer.business_id)
    .maybeSingle();
  if (!business) throw new Error("That offer's business couldn't be found.");

  let stateId: string | null = null;
  if (!currentUser.isNationalAdmin) {
    const { data: area } = await supabase
      .from("passport_areas")
      .select("state_id")
      .eq("id", business.passport_area_id)
      .maybeSingle();
    stateId = area?.state_id ?? null;
  }

  if (!canManageArea(currentUser, business.passport_area_id, "manage_offers", stateId)) {
    throw new Error("You don't have permission to manage this offer.");
  }
  return { currentUser, supabase };
}

export async function setOfferFeatured(offerId: string, featured: boolean) {
  const { supabase } = await requireOfferCapability(offerId);
  const { error } = await supabase.from("offers").update({ featured }).eq("id", offerId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/featured-offers");
}
