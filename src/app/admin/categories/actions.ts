"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasStateCapability } from "@/lib/permissions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// National admin, or a state manager with manage_businesses for this state
// — the same capability that lets them tag businesses with a category in
// the first place.
async function requireStateAccess(stateId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasStateCapability(currentUser, stateId, "manage_businesses")) {
    throw new Error("You don't have permission to manage categories for this state.");
  }
  return currentUser;
}

export async function createCategory(stateId: string, formData: FormData) {
  await requireStateAccess(stateId);
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A category needs a name.");

  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("state_id", stateId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = ((existing?.sort_order as number | undefined) ?? -1) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ state_id: stateId, name, slug: slugify(name), sort_order: nextSortOrder });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
}

export async function renameCategory(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: category } = await supabase.from("categories").select("state_id").eq("id", categoryId).maybeSingle();
  if (!category) throw new Error("Category not found.");
  await requireStateAccess(category.state_id);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A category needs a name.");

  const { error } = await supabase
    .from("categories")
    .update({ name, slug: slugify(name) })
    .eq("id", categoryId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: category } = await supabase.from("categories").select("state_id").eq("id", categoryId).maybeSingle();
  if (!category) throw new Error("Category not found.");
  await requireStateAccess(category.state_id);

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
}
