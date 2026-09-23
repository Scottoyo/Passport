import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AreaAssignment, AreaCapability, StateAssignment } from "@/lib/types/domain";

export interface CurrentUser {
  id: string;
  email: string | null;
  isNationalAdmin: boolean;
  areaAssignments: AreaAssignment[];
  stateAssignments: StateAssignment[];
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

  const [{ data: adminRow }, { data: assignments }, { data: stateAssignments }] = await Promise.all([
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
    supabase
      .from("state_assignments")
      .select("*")
      .eq("user_id", user.id)
      .returns<StateAssignment[]>(),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    isNationalAdmin: Boolean(adminRow),
    areaAssignments: assignments ?? [],
    stateAssignments: stateAssignments ?? [],
  };
}

function hasCapability(
  row: {
    can_view_metrics: boolean;
    can_manage_businesses: boolean;
    can_manage_offers: boolean;
    can_manage_subareas: boolean;
    can_submit_marketing_requests: boolean;
    can_manage_staff: boolean;
    can_manage_leads: boolean;
    can_manage_branding: boolean;
    can_manage_announcements: boolean;
  },
  capability: AreaCapability
): boolean {
  switch (capability) {
    case "view_metrics":
      return row.can_view_metrics;
    case "manage_businesses":
      return row.can_manage_businesses;
    case "manage_offers":
      return row.can_manage_offers;
    case "manage_subareas":
      return row.can_manage_subareas;
    case "submit_marketing_requests":
      return row.can_submit_marketing_requests;
    case "manage_staff":
      return row.can_manage_staff;
    case "manage_leads":
      return row.can_manage_leads;
    case "manage_branding":
      return row.can_manage_branding;
    case "manage_announcements":
      return row.can_manage_announcements;
  }
}

// `stateId` is optional because callers don't always have the area's state
// loaded — when omitted, this only checks direct area_assignments (a
// state-level manager may see less than they're actually entitled to by
// RLS, a UX gap, not a security one). Pass it whenever you have it.
export function canManageArea(
  currentUser: CurrentUser,
  passportAreaId: string,
  capability: AreaCapability,
  stateId?: string | null
): boolean {
  if (currentUser.isNationalAdmin) return true;

  const areaMatch = currentUser.areaAssignments.some(
    (a) => a.passport_area_id === passportAreaId && hasCapability(a, capability)
  );
  if (areaMatch) return true;

  if (!stateId) return false;
  return currentUser.stateAssignments.some((s) => s.state_id === stateId && hasCapability(s, capability));
}

// Pure state-level check (no area_assignments fallback) — used for things
// scoped to the state itself, like creating a region or deciding whether
// to show the region-manager section at all.
export function hasStateCapability(
  currentUser: CurrentUser,
  stateId: string,
  capability: AreaCapability
): boolean {
  if (currentUser.isNationalAdmin) return true;
  return currentUser.stateAssignments.some((s) => s.state_id === stateId && hasCapability(s, capability));
}

// True if the user is a state manager (any capability) for this state,
// regardless of which specific capability — used to gate visibility of the
// region-manager roster, which any state manager can see/manage subject to
// the per-capability ceiling enforced by RLS.
export function isStateManager(currentUser: CurrentUser, stateId: string): boolean {
  return currentUser.stateAssignments.some((s) => s.state_id === stateId);
}

export function assignedAreaIds(currentUser: CurrentUser): string[] {
  return [...new Set(currentUser.areaAssignments.map((a) => a.passport_area_id))];
}

// Every area a manager can act on: directly assigned areas, plus every
// area in any state they're assigned to (current and future areas in that
// state — this has to be a real query, not derivable from what's already
// in CurrentUser).
export async function getAccessibleAreaIds(currentUser: CurrentUser): Promise<string[]> {
  const direct = assignedAreaIds(currentUser);
  if (currentUser.stateAssignments.length === 0) return direct;

  const supabase = await createClient();
  const stateIds = [...new Set(currentUser.stateAssignments.map((s) => s.state_id))];
  const { data } = await supabase.from("passport_areas").select("id").in("state_id", stateIds);
  const viaState = (data ?? []).map((row) => row.id as string);

  return [...new Set([...direct, ...viaState])];
}

// Same shape as getAccessibleAreaIds, but filtered to areas/states where the
// user specifically has `capability` set (not just any capability) — for
// features like the Business Leads CRM where "has some admin role" isn't
// enough, the user needs *this* capability. Callers handle the
// isNationalAdmin case themselves (matches how every other scoped admin
// page already branches: national admin uses getAreaIdsForState/unscoped,
// everyone else calls a getAccessibleAreaIds*-shaped helper).
export async function getAccessibleAreaIdsForCapability(
  currentUser: CurrentUser,
  capability: AreaCapability
): Promise<string[]> {
  const direct = currentUser.areaAssignments
    .filter((a) => hasCapability(a, capability))
    .map((a) => a.passport_area_id);

  const capableStateIds = currentUser.stateAssignments
    .filter((s) => hasCapability(s, capability))
    .map((s) => s.state_id);
  if (capableStateIds.length === 0) return [...new Set(direct)];

  const supabase = await createClient();
  const { data } = await supabase.from("passport_areas").select("id").in("state_id", capableStateIds);
  const viaState = (data ?? []).map((row) => row.id as string);

  return [...new Set([...direct, ...viaState])];
}

// True if the user can use a `capability`-gated feature at all (national
// admin, or at least one area/state assignment row with it set) - for
// nav-visibility and route-gating, not for scoping a query (use
// getAccessibleAreaIdsForCapability for that).
export function hasAnyCapability(currentUser: CurrentUser, capability: AreaCapability): boolean {
  if (currentUser.isNationalAdmin) return true;
  return (
    currentUser.areaAssignments.some((a) => hasCapability(a, capability)) ||
    currentUser.stateAssignments.some((s) => hasCapability(s, capability))
  );
}
