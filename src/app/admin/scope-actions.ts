"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SCOPE_COOKIE } from "@/lib/admin-scope";

export async function setAdminScope(formData: FormData) {
  const slug = String(formData.get("state") ?? "");
  const cookieStore = await cookies();

  if (slug) {
    cookieStore.set(ADMIN_SCOPE_COOKIE, slug, {
      path: "/admin",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.delete(ADMIN_SCOPE_COOKIE);
  }

  revalidatePath("/admin", "layout");
}
