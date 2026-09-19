"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SCOPE_COOKIE, ADMIN_SCOPE_AREA_COOKIE } from "@/lib/admin-scope";

export async function setAdminScope(formData: FormData) {
  const slug = String(formData.get("state") ?? "");
  const cookieStore = await cookies();

  // Always the same explicit path ("/", not "/admin") on every set/clear —
  // a cookie's default path is derived from whichever URL the request that
  // sets it was made to, which varies depending on which admin page the
  // selector was changed from ("/admin" vs. "/admin/passport-holders" etc.
  // don't share a default path), so relying on any default here is how the
  // previous bug happened. Pin it to "/" so there's only ever one path.
  if (slug) {
    cookieStore.set(ADMIN_SCOPE_COOKIE, slug, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.set(ADMIN_SCOPE_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  }

  // Changing state always clears any region narrowing — the previously
  // selected region almost certainly doesn't belong to the new state.
  cookieStore.set(ADMIN_SCOPE_AREA_COOKIE, "", { path: "/", maxAge: 0 });

  revalidatePath("/admin", "layout");
}

export async function setAdminAreaScope(formData: FormData) {
  const areaId = String(formData.get("area") ?? "");
  const cookieStore = await cookies();

  if (areaId) {
    cookieStore.set(ADMIN_SCOPE_AREA_COOKIE, areaId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.set(ADMIN_SCOPE_AREA_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  }

  revalidatePath("/admin", "layout");
}
