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
    // cookieStore.delete(name) clears a cookie at the default "/" path —
    // it doesn't match (and so doesn't clear) one set at path "/admin",
    // leaving the old selection stuck. Overwrite it at the same path
    // with maxAge 0 instead, which reliably clears it.
    cookieStore.set(ADMIN_SCOPE_COOKIE, "", {
      path: "/admin",
      maxAge: 0,
    });
  }

  revalidatePath("/admin", "layout");
}
