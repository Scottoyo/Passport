"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import type { ContentStatus } from "@/lib/types/domain";

async function requireNationalAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can manage Passport products.");
  }
}

export async function createPassportProduct(formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const stateId = String(formData.get("state_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceDollars = Number(formData.get("price") ?? 0);
  const durationDays = Number(formData.get("duration_days") ?? 365);
  const maxMembers = Number(formData.get("max_members") ?? 1);

  if (!stateId || !name || !Number.isFinite(priceDollars) || priceDollars < 0) {
    throw new Error("A Passport product needs a state, a name, and a valid price.");
  }

  const { error } = await supabase.from("passport_products").insert({
    state_id: stateId,
    name,
    description: description || null,
    price_cents: Math.round(priceDollars * 100),
    duration_days: durationDays > 0 ? durationDays : 365,
    max_members: maxMembers > 0 ? maxMembers : 1,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/passport-products");
}

export async function setPassportProductStatus(productId: string, status: ContentStatus) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("passport_products").update({ status }).eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/passport-products");
}
