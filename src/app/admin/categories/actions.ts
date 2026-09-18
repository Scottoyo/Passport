"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireNationalAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) {
    throw new Error("Only national admins can manage categories.");
  }
}

export async function createCategory(formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A category needs a name.");

  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = ((existing?.sort_order as number | undefined) ?? -1) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ name, slug: slugify(name), sort_order: nextSortOrder });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
}

export async function renameCategory(categoryId: string, formData: FormData) {
  await requireNationalAdmin();
  const supabase = await createClient();

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
  await requireNationalAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
}
