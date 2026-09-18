import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAreaIdsForState, NO_MATCH_ID } from "@/lib/admin-scope";
import type {
  Business,
  Offer,
  PassportArea,
  PassportProduct,
  Passport,
  Profile,
  State,
} from "@/lib/types/domain";

// Admin-only, cross-area/cross-status queries. Unlike src/lib/queries.ts
// (public, "active only" via RLS), these rely on the signed-in user being a
// national admin — RLS grants national admins read access to every row
// regardless of status, which is what powers these list pages.

export interface PassportWithOwner extends Passport {
  owner: Profile | null;
}

async function attachOwners(passports: Passport[]): Promise<PassportWithOwner[]> {
  const supabase = await createClient();
  const ownerIds = [...new Set(passports.map((p) => p.owner_user_id))];
  const { data: profiles } = ownerIds.length
    ? await supabase.from("profiles").select("*").in("id", ownerIds).returns<Profile[]>()
    : { data: [] as Profile[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return passports.map((p) => ({ ...p, owner: profileById.get(p.owner_user_id) ?? null }));
}

export async function getPassportsWithHolders(
  opts: { stateId?: string; expiredOnly?: boolean } = {}
): Promise<PassportWithOwner[]> {
  const supabase = await createClient();
  let query = supabase.from("passports").select("*").order("purchased_at", { ascending: false });

  if (opts.stateId) {
    query = query.eq("state_id", opts.stateId);
  }

  const { data } = await query.returns<Passport[]>();
  let passports = data ?? [];

  if (opts.expiredOnly) {
    const now = Date.now();
    passports = passports.filter(
      (p) => p.status === "expired" || new Date(p.expires_at).getTime() < now
    );
  }

  return attachOwners(passports);
}

export async function getProfilesWithoutPassports(): Promise<Profile[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: passports }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).returns<Profile[]>(),
    supabase.from("passports").select("owner_user_id"),
  ]);
  const ownerIds = new Set((passports ?? []).map((p) => p.owner_user_id as string));
  return (profiles ?? []).filter((p) => !ownerIds.has(p.id));
}

export interface BusinessWithLocation extends Business {
  areaName: string | null;
  stateName: string | null;
}

async function attachLocations(businesses: Business[]): Promise<BusinessWithLocation[]> {
  const supabase = await createClient();
  const areaIds = [...new Set(businesses.map((b) => b.passport_area_id))];
  const { data: areas } = areaIds.length
    ? await supabase.from("passport_areas").select("*").in("id", areaIds).returns<PassportArea[]>()
    : { data: [] as PassportArea[] };
  const stateIds = [...new Set((areas ?? []).map((a) => a.state_id))];
  const { data: states } = stateIds.length
    ? await supabase.from("states").select("*").in("id", stateIds).returns<State[]>()
    : { data: [] as State[] };

  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));
  const stateById = new Map((states ?? []).map((s) => [s.id, s]));

  return businesses.map((b) => {
    const area = areaById.get(b.passport_area_id);
    const state = area ? stateById.get(area.state_id) : undefined;
    return { ...b, areaName: area?.name ?? null, stateName: state?.name ?? null };
  });
}

export async function getAllBusinessesNational(
  opts: { stateId?: string } = {}
): Promise<BusinessWithLocation[]> {
  const supabase = await createClient();
  let query = supabase.from("businesses").select("*").order("name");

  if (opts.stateId) {
    const areaIds = await getAreaIdsForState(opts.stateId);
    query = query.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  }

  const { data } = await query.returns<Business[]>();
  return attachLocations(data ?? []);
}

export interface OfferWithBusiness extends Offer {
  businessName: string;
  areaName: string | null;
  stateName: string | null;
}

export async function getAllOffersNational(
  opts: { stateId?: string } = {}
): Promise<OfferWithBusiness[]> {
  const supabase = await createClient();

  let businessIds: string[] | null = null;
  if (opts.stateId) {
    const areaIds = await getAreaIdsForState(opts.stateId);
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id")
      .in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
    businessIds = (businesses ?? []).map((b) => b.id as string);
  }

  let query = supabase.from("offers").select("*").order("created_at", { ascending: false });
  if (businessIds) {
    query = query.in("business_id", businessIds.length ? businessIds : [NO_MATCH_ID]);
  }

  const { data: offers } = await query.returns<Offer[]>();
  const list = offers ?? [];

  const allBusinessIds = [...new Set(list.map((o) => o.business_id))];
  const { data: businesses } = allBusinessIds.length
    ? await supabase.from("businesses").select("*").in("id", allBusinessIds).returns<Business[]>()
    : { data: [] as Business[] };
  const enrichedBusinesses = await attachLocations(businesses ?? []);
  const businessById = new Map(enrichedBusinesses.map((b) => [b.id, b]));

  return list.map((offer) => {
    const business = businessById.get(offer.business_id);
    return {
      ...offer,
      businessName: business?.name ?? "Unknown business",
      areaName: business?.areaName ?? null,
      stateName: business?.stateName ?? null,
    };
  });
}

export async function getAllPassportProducts(
  opts: { stateId?: string } = {}
): Promise<PassportProduct[]> {
  const supabase = await createClient();
  let query = supabase.from("passport_products").select("*").order("price_cents");
  if (opts.stateId) query = query.eq("state_id", opts.stateId);
  const { data } = await query.returns<PassportProduct[]>();
  return data ?? [];
}
