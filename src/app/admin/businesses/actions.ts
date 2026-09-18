"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";

export async function setBusinessFeatured(businessId: string, featured: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can feature businesses.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ featured }).eq("id", businessId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}
