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

export async function setBusinessApproval(businessId: string, approvalStatus: "approved" | "rejected") {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can approve or reject businesses.");
  }

  const supabase = await createClient();
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
