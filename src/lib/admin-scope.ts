import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleAreaIds, type CurrentUser } from "@/lib/permissions";
import type { State, PassportArea } from "@/lib/types/domain";

// Shared "National vs. one state" scope for the whole admin portal. It's a
// single persistent choice (a cookie), set once from the selector in
// admin/layout.tsx, rather than a per-page URL param — so it stays applied
// as a national admin moves between Businesses, Categories, Featured
// Offers, etc. without re-selecting it on every tab.
// Renamed (was admin_scope_state) to orphan any stale cookies left behind
// by an earlier bug where clearing it didn't match the path it was set
// with, so old browsers get a guaranteed-clean slate rather than a stray
// duplicate cookie shadowing the real one.
export const ADMIN_SCOPE_COOKIE = "admin_scope";

// A second, optional narrowing within the state scope above (or within a
// manager's own accessible regions) — one specific passport_areas.id.
// Stored by id, not slug: area slugs are only unique within a state, not
// globally, unlike state slugs.
export const ADMIN_SCOPE_AREA_COOKIE = "admin_scope_area";

export async function getCurrentAdminScope(): Promise<{ state: State | null; area: PassportArea | null }> {
  const cookieStore = await cookies();
  const slug = cookieStore.get(ADMIN_SCOPE_COOKIE)?.value;
  const areaId = cookieStore.get(ADMIN_SCOPE_AREA_COOKIE)?.value;

  const supabase = await createClient();
  const [{ data: stateData }, { data: areaData }] = await Promise.all([
    slug
      ? supabase.from("states").select("*").eq("slug", slug).maybeSingle<State>()
      : Promise.resolve({ data: null }),
    areaId
      ? supabase.from("passport_areas").select("*").eq("id", areaId).maybeSingle<PassportArea>()
      : Promise.resolve({ data: null }),
  ]);
  return { state: stateData ?? null, area: areaData ?? null };
}

// Every page that scopes by area calls this once it has its own base set of
// area ids (a national admin's selected state's areas, or a manager's
// accessible areas) — narrows to just the selected region when it's a real
// member of that base set, otherwise silently ignores a stale/mismatched
// selection (e.g. left over after switching states) rather than erroring.
export function narrowAreaIds(baseAreaIds: string[], selectedArea: PassportArea | null): string[] {
  if (selectedArea && baseAreaIds.includes(selectedArea.id)) return [selectedArea.id];
  return baseAreaIds;
}

export async function getAllStatesForAdmin(): Promise<State[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("states")
    .select("*")
    .order("name")
    .returns<State[]>();
  return data ?? [];
}

// Resolves "what area ids can this user currently see" once, factoring out
// the isNationalAdmin-with-optional-state-or-region-selection vs.
// manager-with-optional-region-selection branch that every scoped admin page
// otherwise repeats inline - used by call sites that don't already have
// their own copy of that block (the header bell, the notifications page).
export async function getAdminScopedAreaIds(currentUser: CurrentUser): Promise<string[] | null> {
  const { state, area } = await getCurrentAdminScope();
  const baseAreaIds = currentUser.isNationalAdmin
    ? state
      ? await getAreaIdsForState(state.id)
      : null
    : await getAccessibleAreaIds(currentUser);
  return baseAreaIds ? narrowAreaIds(baseAreaIds, area) : null;
}

export async function getAreaIdsForState(stateId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passport_areas")
    .select("id")
    .eq("state_id", stateId);
  return (data ?? []).map((row) => row.id as string);
}

// Supabase `.in()` on an empty array matches everything, not nothing — this
// sentinel keeps "no rows match" queries actually returning no rows.
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";
