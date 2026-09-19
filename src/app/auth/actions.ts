"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Managers (national/state/region) land on their admin dashboard, not the
// passport-holder account pages - mirrors the exact isAdmin check
// site-header.tsx already uses to decide which header to render.
export async function getPostSignInRedirect(): Promise<string> {
  const currentUser = await getCurrentUser();
  const isAdmin =
    !!currentUser &&
    (currentUser.isNationalAdmin || currentUser.stateAssignments.length > 0 || currentUser.areaAssignments.length > 0);
  return isAdmin ? "/admin" : "/account";
}
