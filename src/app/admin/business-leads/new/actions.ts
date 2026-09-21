"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import type { BusinessLeadDisposition } from "@/lib/types/domain";

const VALID_DISPOSITIONS = new Set(["lead", "in_progress", "closed_won", "lost"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a result object rather than calling redirect() itself, so the
// client form (business-lead-form.tsx) decides navigation the same way
// RegisterBusinessForm already does - the one other client-driven form in
// this codebase, and the pattern this form is deliberately modeled on.
export async function createBusinessLead(formData: FormData): Promise<{ error: string } | { leadId: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You don't have permission to create leads." };

  const stateId = String(formData.get("state_id") ?? "").trim();
  const areaId = String(formData.get("passport_area_id") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const contactFirstName = String(formData.get("contact_first_name") ?? "").trim();
  const contactLastName = String(formData.get("contact_last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const dispositionRaw = String(formData.get("disposition") ?? "lead");
  const disposition = (VALID_DISPOSITIONS.has(dispositionRaw) ? dispositionRaw : "lead") as BusinessLeadDisposition;
  const emailed = formData.get("emailed") === "on";
  const called = formData.get("called") === "on";
  const visited = formData.get("visited") === "on";
  const note = String(formData.get("note") ?? "").trim();

  // Re-validate everything server-side regardless of what the client's own
  // validate() already checked - the client check is UX only.
  if (!businessName) return { error: "Business name is required." };
  if (!stateId) return { error: "State is required." };
  if (!areaId) return { error: "Region is required." };
  if (email && !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();

  // The submitted region must actually belong to the submitted state -
  // never trust the client-side pairing.
  const { data: area } = await supabase
    .from("passport_areas")
    .select("id, state_id")
    .eq("id", areaId)
    .maybeSingle();
  if (!area || area.state_id !== stateId) {
    return { error: "That region doesn't belong to the selected state." };
  }

  if (!canManageArea(currentUser, areaId, "manage_leads", stateId)) {
    return { error: "You don't have permission to create leads in that region." };
  }

  const { data: lead, error } = await supabase
    .from("business_leads")
    .insert({
      state_id: stateId,
      passport_area_id: areaId,
      business_name: businessName,
      contact_first_name: contactFirstName || null,
      contact_last_name: contactLastName || null,
      phone: phone || null,
      email: email || null,
      disposition,
      emailed,
      called,
      visited,
      created_by: currentUser.id,
    })
    .select("id")
    .single();

  if (error || !lead) return { error: error?.message ?? "Couldn't create the lead." };

  if (note) {
    const { error: noteError } = await supabase
      .from("business_lead_notes")
      .insert({ business_lead_id: lead.id, note, created_by: currentUser.id });
    // The lead itself was created successfully; a note failure shouldn't
    // block navigation to it, just surface via the note not appearing.
    if (noteError) console.error("Failed to create initial lead note:", noteError.message);
  }

  revalidatePath("/admin/business-leads");
  return { leadId: lead.id as string };
}
