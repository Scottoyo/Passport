"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { NATIONAL_BRANDING_ID } from "@/lib/resolve-theme";

// National branding has no sub-scoping (there's only ever one row) - a
// plain national-admin check, same tier of decision as a region's
// lifecycle launch/pause.
async function requireNationalAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can update national branding.");
  }
  return currentUser;
}

export async function updateNationalBranding(formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();
  const primaryColor = String(formData.get("brand_primary_color") ?? "").trim();
  const secondaryColor = String(formData.get("brand_secondary_color") ?? "").trim();
  const accentColor = String(formData.get("brand_accent_color") ?? "").trim();
  const textColor = String(formData.get("brand_text_color") ?? "").trim();
  const backgroundColor = String(formData.get("brand_background_color") ?? "").trim();
  const heroOverlay = String(formData.get("brand_hero_overlay") ?? "").trim();
  const logoUrl = String(formData.get("brand_logo_url") ?? "").trim();

  const { error } = await supabase
    .from("national_branding")
    .update({
      brand_primary_color: primaryColor || null,
      brand_secondary_color: secondaryColor || null,
      brand_accent_color: accentColor || null,
      brand_text_color: textColor || null,
      brand_background_color: backgroundColor || null,
      brand_hero_overlay: heroOverlay || null,
      brand_logo_url: logoUrl || null,
    })
    .eq("id", NATIONAL_BRANDING_ID);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/national-branding");
  revalidatePath("/");
}

export async function uploadNationalHeroImage(formData: FormData) {
  await requireNationalAdmin();
  const file = formData.get("hero_image") as File | null;
  if (!file || file.size === 0) throw new Error("Choose an image to upload.");

  const { uploadBrandingHero, withCacheBust } = await import("@/lib/storage");
  const url = withCacheBust(await uploadBrandingHero("national", null, file));

  const supabase = await createClient();
  const { error } = await supabase
    .from("national_branding")
    .update({ hero_image_url: url })
    .eq("id", NATIONAL_BRANDING_ID);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/national-branding");
  revalidatePath("/");
}
