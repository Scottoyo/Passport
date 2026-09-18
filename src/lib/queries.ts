import { createClient } from "@/lib/supabase/server";
import type {
  Business,
  Category,
  Offer,
  Passport,
  PassportArea,
  PassportProduct,
  State,
  Subarea,
} from "@/lib/types/domain";

// Public, read-side queries shared by the national/state/area/subarea pages.
// Every one of these relies on RLS ("public read active") rather than
// filtering client-side, so a bug here can't leak draft/paused content.

export async function getActiveStates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("states")
    .select("*")
    .order("name")
    .returns<State[]>();
  return data ?? [];
}

export async function getStateBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("states")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<State>();
  return data;
}

export async function getAreasForState(stateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passport_areas")
    .select("*")
    .eq("state_id", stateId)
    .order("name")
    .returns<PassportArea[]>();
  return data ?? [];
}

export interface AreaWithState extends PassportArea {
  stateName: string;
  stateSlug: string;
}

// Every active region nationwide, with its state attached — the primary
// data source for the region-first Passport picker (most visitors think in
// terms of "my region" first, state is really just how a Passport happens
// to be priced/sold).
export async function getActiveAreasWithStates(): Promise<AreaWithState[]> {
  const supabase = await createClient();
  const [{ data: areas }, { data: states }] = await Promise.all([
    supabase.from("passport_areas").select("*").returns<PassportArea[]>(),
    supabase.from("states").select("id, name, slug").returns<Pick<State, "id" | "name" | "slug">[]>(),
  ]);
  const stateById = new Map((states ?? []).map((s) => [s.id, s]));

  return (areas ?? [])
    .map((area) => {
      const state = stateById.get(area.state_id);
      return state ? { ...area, stateName: state.name, stateSlug: state.slug } : null;
    })
    .filter((area): area is AreaWithState => area !== null)
    .sort((a, b) => a.stateName.localeCompare(b.stateName) || a.name.localeCompare(b.name));
}

export async function getAreaBySlug(stateId: string, areaSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passport_areas")
    .select("*")
    .eq("state_id", stateId)
    .eq("slug", areaSlug)
    .maybeSingle<PassportArea>();
  return data;
}

export async function getSubareasForArea(areaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subareas")
    .select("*")
    .eq("passport_area_id", areaId)
    .order("name")
    .returns<Subarea[]>();
  return data ?? [];
}

export async function getSubareaBySlug(areaId: string, subareaSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subareas")
    .select("*")
    .eq("passport_area_id", areaId)
    .eq("slug", subareaSlug)
    .maybeSingle<Subarea>();
  return data;
}

export async function getBusinessesForArea(
  areaId: string,
  opts: { subareaId?: string } = {}
) {
  const supabase = await createClient();
  let query = supabase
    .from("businesses")
    .select("*")
    .eq("passport_area_id", areaId)
    .order("name");
  if (opts.subareaId) query = query.eq("subarea_id", opts.subareaId);
  const { data } = await query.returns<Business[]>();
  return data ?? [];
}

export async function getBusinessBySlug(areaId: string, businessSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("passport_area_id", areaId)
    .eq("slug", businessSlug)
    .maybeSingle<Business>();
  return data;
}

export async function getOffersForBusiness(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .returns<Offer[]>();
  return data ?? [];
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .returns<Category[]>();
  return data ?? [];
}

// RLS restricts this to the signed-in user's own passports regardless of
// what's queried for, so no explicit owner filter is required here — but we
// add one anyway for clarity and to avoid a surprise empty/leaky query if
// RLS is ever misconfigured.
export async function getMyPassports(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passports")
    .select("*")
    .eq("owner_user_id", userId)
    .order("purchased_at", { ascending: false })
    .returns<Passport[]>();
  return data ?? [];
}

export async function getActivePassportProductForState(stateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passport_products")
    .select("*")
    .eq("status", "active")
    .eq("state_id", stateId)
    .order("price_cents")
    .limit(1)
    .maybeSingle<PassportProduct>();
  return data;
}
