"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canManageArea } from "@/lib/permissions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createBusinessNational(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("You must be signed in to add a business.");

  const areaId = String(formData.get("area_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!areaId) throw new Error("Choose a region.");
  if (!name) throw new Error("A business needs a name.");

  const supabase = await createClient();
  const { data: area } = await supabase
    .from("passport_areas")
    .select("id, state_id")
    .eq("id", areaId)
    .maybeSingle();
  if (!area) throw new Error("That region doesn't exist.");

  if (!canManageArea(currentUser, area.id, "manage_businesses", area.state_id)) {
    throw new Error("You don't have permission to add a business to that region.");
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .insert({
      passport_area_id: areaId,
      name,
      slug: slugify(name),
      created_by: currentUser.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/admin/areas/${areaId}/businesses/${business.id}?mode=edit`);
}
