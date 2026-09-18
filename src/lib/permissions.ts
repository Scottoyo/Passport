import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AreaAssignment, AreaCapability } from "@/lib/types/domain";

export interface CurrentUser {
  id: string;
  email: string | null;
  isNationalAdmin: boolean;
  areaAssignments: AreaAssignment[];
}

// The single place admin pages and Server Actions call to find out who is
// asking and what they're allowed to touch. This mirrors the RLS policies
// in supabase/migrations/0003_rls.sql — it exists so pages can render the
// right UI and fail fast with a clear error, not as a substitute for RLS.
// Every write still goes through Supabase, which re-checks RLS regardless
// of what this function returns.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: adminRow }, { data: assignments }] = await Promise.all([
    supabase
      .from("national_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("area_assignments")
      .select("*")
      .eq("user_id", user.id)
      .returns<AreaAssignment[]>(),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    isNationalAdmin: Boolean(adminRow),
    areaAssignments: assignments ?? [],
  };
}

export function canManageArea(
  currentUser: CurrentUser,
  passportAreaId: string,
  capability: AreaCapability
): boolean {
  if (currentUser.isNationalAdmin) return true;

  return currentUser.areaAssignments.some((assignment) => {
    if (assignment.passport_area_id !== passportAreaId) return false;
    switch (capability) {
      case "view_metrics":
        return assignment.can_view_metrics;
      case "manage_businesses":
        return assignment.can_manage_businesses;
      case "manage_offers":
        return assignment.can_manage_offers;
      case "manage_subareas":
        return assignment.can_manage_subareas;
      case "submit_marketing_requests":
        return assignment.can_submit_marketing_requests;
      case "manage_staff":
        return assignment.can_manage_staff;
    }
  });
}

export function assignedAreaIds(currentUser: CurrentUser): string[] {
  return [...new Set(currentUser.areaAssignments.map((a) => a.passport_area_id))];
}
