import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { State } from "@/lib/types/domain";

// Shared "National vs. one state" scope for the whole admin portal. It's a
// single persistent choice (a cookie), set once from the selector in
// admin/layout.tsx, rather than a per-page URL param — so it stays applied
// as a national admin moves between Businesses, Categories, Featured
// Offers, etc. without re-selecting it on every tab.
export const ADMIN_SCOPE_COOKIE = "admin_scope_state";

export async function getCurrentAdminScope(): Promise<{ state: State | null }> {
  const cookieStore = await cookies();
  const slug = cookieStore.get(ADMIN_SCOPE_COOKIE)?.value;
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
