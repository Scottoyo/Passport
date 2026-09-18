"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";

export async function setOfferFeatured(offerId: string, featured: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can feature offers.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("offers").update({ featured }).eq("id", offerId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/featured-offers");
}
