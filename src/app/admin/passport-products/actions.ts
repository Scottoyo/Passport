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

  const areaId = String(formData.get("passport_area_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceDollars = Number(formData.get("price") ?? 0);
  const durationDays = Number(formData.get("duration_days") ?? 365);

  if (!areaId || !name || !Number.isFinite(priceDollars) || priceDollars < 0) {
    throw new Error("A Passport product needs a region, a name, and a valid price.");
  }

  const { data: area, error: areaError } = await supabase
    .from("passport_areas")
    .select("state_id")
    .eq("id", areaId)
    .maybeSingle();
  if (areaError || !area) throw new Error("That region couldn't be found.");

  const { error } = await supabase.from("passport_products").insert({
    passport_area_id: areaId,
    state_id: area.state_id,
    name,
    description: description || null,
    price_cents: Math.round(priceDollars * 100),
    duration_days: durationDays > 0 ? durationDays : 365,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/passport-products");
}

export async function updatePassportProductName(productId: string, formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A Passport product needs a name.");

  const { error } = await supabase.from("passport_products").update({ name }).eq("id", productId);
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
