"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import type { BusinessLeadDisposition } from "@/lib/types/domain";

const VALID_DISPOSITIONS = new Set(["lead", "in_progress", "closed_won", "lost"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same shape as requireBusinessCapability in admin/businesses/actions.ts:
// look up the row's own area/state, then check the caller's capability
// against it - never trust that a caller reaching this action already
// passed a UI-level check.
async function requireLeadCapability(leadId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You don't have permission to manage this lead.");

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("business_leads")
    .select("id, state_id, passport_area_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) throw new Error("That lead couldn't be found.");

  if (!canManageArea(currentUser, lead.passport_area_id, "manage_leads", lead.state_id)) {
    throw new Error("You don't have permission to manage this lead.");
  }
  return { currentUser, supabase, lead };
}

export async function updateBusinessLead(
  leadId: string,
  formData: FormData
): Promise<{ error: string } | { ok: true }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You don't have permission to edit this lead." };

  const supabase = await createClient();
  const { data: existingLead } = await supabase
    .from("business_leads")
    .select("id, state_id, passport_area_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!existingLead) return { error: "That lead couldn't be found." };

  if (!canManageArea(currentUser, existingLead.passport_area_id, "manage_leads", existingLead.state_id)) {
    return { error: "You don't have permission to edit this lead." };
  }

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

  if (!businessName) return { error: "Business name is required." };
  if (!stateId) return { error: "State is required." };
  if (!areaId) return { error: "Region is required." };
  if (email && !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const { data: area } = await supabase
    .from("passport_areas")
    .select("id, state_id")
    .eq("id", areaId)
    .maybeSingle();
  if (!area || area.state_id !== stateId) {
    return { error: "That region doesn't belong to the selected state." };
  }

  // Moving the lead: the caller must be authorized for the *destination*
  // region/state too, not just wherever the lead currently sits - a state
  // or region manager can't use an edit to relocate a lead into scope they
  // don't have (RLS's own `with check` clause is the real backstop here
  // regardless of this earlier check).
  if (!canManageArea(currentUser, areaId, "manage_leads", stateId)) {
    return { error: "You don't have permission to move this lead into that region." };
  }

  const { error } = await supabase
    .from("business_leads")
    .update({
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
    })
    .eq("id", leadId);
  if (error) return { error: error.message };

  revalidatePath("/admin/business-leads");
  revalidatePath(`/admin/business-leads/${leadId}`);
  return { ok: true };
}

export async function setLeadDisposition(leadId: string, formData: FormData) {
  const { supabase } = await requireLeadCapability(leadId);
  const dispositionRaw = String(formData.get("disposition") ?? "");
  if (!VALID_DISPOSITIONS.has(dispositionRaw)) throw new Error("Invalid disposition.");

  // Closed Won only ever changes this one column - it must never create a
  // business listing, business-portal user, offer, or anything else. That
  // "convert to listing" workflow is explicitly out of scope for this
  // phase and does not exist here.
  const { error } = await supabase
    .from("business_leads")
    .update({ disposition: dispositionRaw as BusinessLeadDisposition })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/business-leads/${leadId}`);
  revalidatePath("/admin/business-leads");
}

export async function setLeadActivity(leadId: string, field: "emailed" | "called" | "visited", formData: FormData) {
  const { supabase } = await requireLeadCapability(leadId);
  const value = formData.get(field) === "on";
  const { error } = await supabase.from("business_leads").update({ [field]: value }).eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/business-leads/${leadId}`);
  revalidatePath("/admin/business-leads");
}

export async function addBusinessLeadNote(leadId: string, formData: FormData) {
  const { currentUser, supabase } = await requireLeadCapability(leadId);
  const note = String(formData.get("note") ?? "").trim();
  if (!note) throw new Error("A note can't be empty.");

  const { error } = await supabase
    .from("business_lead_notes")
    .insert({ business_lead_id: leadId, note, created_by: currentUser.id });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/business-leads/${leadId}`);
}
