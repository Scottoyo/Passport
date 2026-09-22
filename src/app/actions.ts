"use server";

import { createClient } from "@/lib/supabase/server";

export async function joinStateWaitlist(stateId: string, formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    return { error: "First name, last name, and email are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("perk_waitlist_signups").insert({
    state_id: stateId,
    first_name: firstName,
    last_name: lastName,
    email,
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  return { error: null };
}
