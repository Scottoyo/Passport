import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { State } from "@/lib/types/domain";

// Shared "National vs. one state" filter used across the admin portal's list
// pages. The URL carries the choice as ?state=<slug> so it survives
// navigation/refresh and works without client-side data fetching, matching
// how the rest of the admin portal is server-rendered.

export async function resolveStateFilter(
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ state: State | null }> {
  const raw = searchParams.state;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  if (!slug) return { state: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("states")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<State>();
  return { state: data ?? null };
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
