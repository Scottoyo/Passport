"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireSelf() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");
  return { supabase, userId: user.id };
}

export async function updateMyProfile(formData: FormData) {
  const { supabase, userId } = await requireSelf();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const ageRange = String(formData.get("age_range") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      age_range: ageRange || null,
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
  revalidatePath(`/admin/passport-holders/${userId}`);
}

export async function updateMyPassportDates(passportId: string, formData: FormData) {
  const { supabase } = await requireSelf();

  const start = String(formData.get("travel_start_date") ?? "");
  const end = String(formData.get("travel_end_date") ?? "");

  const { error } = await supabase
    .from("passports")
    .update({ travel_start_date: start || null, travel_end_date: end || null })
    .eq("id", passportId);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
}
