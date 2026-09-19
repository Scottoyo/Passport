"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import type { MarketingRequest } from "@/lib/types/domain";

export async function updateMarketingRequestStatus(
  requestId: string,
  status: MarketingRequest["status"],
  formData: FormData
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You don't have permission to triage marketing requests.");

  if (!currentUser.isNationalAdmin) {
    const supabase = await createClient();
    const { data: request } = await supabase
      .from("marketing_requests")
      .select("passport_area_id")
      .eq("id", requestId)
      .maybeSingle();
    const { data: area } = request
      ? await supabase.from("passport_areas").select("state_id").eq("id", request.passport_area_id).maybeSingle()
      : { data: null };

    if (
      !request ||
      !canManageArea(currentUser, request.passport_area_id, "manage_businesses", area?.state_id ?? null)
    ) {
      throw new Error("You don't have permission to triage marketing requests for this region.");
    }
  }

  const supabase = await createClient();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();

  const { error } = await supabase
    .from("marketing_requests")
    .update({
      status,
      admin_notes: adminNotes || null,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    })
    .eq("id", requestId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/marketing-requests");
}
