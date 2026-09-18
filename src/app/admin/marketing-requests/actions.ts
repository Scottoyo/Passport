"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import type { MarketingRequest } from "@/lib/types/domain";

export async function updateMarketingRequestStatus(
  requestId: string,
  status: MarketingRequest["status"],
  formData: FormData
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can triage marketing requests.");
  }

  const supabase = await createClient();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  const { error } = await supabase
    .from("marketing_requests")
    .update({ status, admin_notes: adminNotes || null })
    .eq("id", requestId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/marketing-requests");
}
