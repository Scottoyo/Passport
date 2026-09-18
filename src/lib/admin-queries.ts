import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAreaIdsForState, NO_MATCH_ID } from "@/lib/admin-scope";
import type {
  Business,
  BusinessFavorite,
  Offer,
  PassportArea,
  PassportProduct,
  Passport,
  Profile,
  Redemption,
  State,
} from "@/lib/types/domain";

// Admin-only, cross-area/cross-status queries. Unlike src/lib/queries.ts
// (public, "active only" via RLS), these rely on the signed-in user being a
// national admin — RLS grants national admins read access to every row
// regardless of status, which is what powers these list pages.

export interface PassportWithOwner extends Passport {
  owner: Profile | null;
  stateName: string | null;
}

async function attachOwners(passports: Passport[]): Promise<PassportWithOwner[]> {
  const supabase = await createClient();
  const ownerIds = [...new Set(passports.map((p) => p.owner_user_id))];
  const stateIds = [...new Set(passports.map((p) => p.state_id))];
  const [{ data: profiles }, { data: states }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("*").in("id", ownerIds).returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
    stateIds.length
      ? supabase.from("states").select("id, name").in("id", stateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const stateNameById = new Map((states ?? []).map((s) => [s.id as string, s.name as string]));
  return passports.map((p) => ({
    ...p,
    owner: profileById.get(p.owner_user_id) ?? null,
    stateName: stateNameById.get(p.state_id) ?? null,
  }));
}

export async function getPassportsWithHolders(
  opts: { stateId?: string; stateIds?: string[]; expiredOnly?: boolean } = {}
): Promise<PassportWithOwner[]> {
  const supabase = await createClient();
  let query = supabase.from("passports").select("*").order("purchased_at", { ascending: false });

  if (opts.stateId) {
    query = query.eq("state_id", opts.stateId);
  } else if (opts.stateIds) {
    query = query.in("state_id", opts.stateIds.length ? opts.stateIds : [NO_MATCH_ID]);
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

export async function getHolderProfile(profileId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", profileId).returns<Profile[]>();
  return data?.[0] ?? null;
}

export interface PassportWithDetails extends Passport {
  stateName: string | null;
  productName: string | null;
  priceCents: number | null;
}

// Every passport a holder has ever had, newest first — this doubles as
// "order history" (a passport row *is* the purchase; there's no separate
// orders table in this schema).
export async function getPassportsForHolder(profileId: string): Promise<PassportWithDetails[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passports")
    .select("*")
    .eq("owner_user_id", profileId)
    .order("purchased_at", { ascending: false })
    .returns<Passport[]>();
  const passports = data ?? [];

  const stateIds = [...new Set(passports.map((p) => p.state_id))];
  const productIds = [...new Set(passports.map((p) => p.passport_product_id))];
  const [{ data: states }, { data: products }] = await Promise.all([
    stateIds.length
      ? supabase.from("states").select("*").in("id", stateIds).returns<State[]>()
      : Promise.resolve({ data: [] as State[] }),
    productIds.length
      ? supabase.from("passport_products").select("*").in("id", productIds).returns<PassportProduct[]>()
      : Promise.resolve({ data: [] as PassportProduct[] }),
  ]);
  const stateById = new Map((states ?? []).map((s) => [s.id, s]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  return passports.map((p) => ({
    ...p,
    stateName: stateById.get(p.state_id)?.name ?? null,
    productName: productById.get(p.passport_product_id)?.name ?? null,
    priceCents: productById.get(p.passport_product_id)?.price_cents ?? null,
  }));
}

export interface RedemptionWithDetails extends Redemption {
  offerTitle: string;
  businessName: string;
}

export async function getRedemptionsForPassports(passportIds: string[]): Promise<RedemptionWithDetails[]> {
  if (passportIds.length === 0) return [];
  const supabase = await createClient();
  const { data: redemptions } = await supabase
    .from("redemptions")
    .select("*")
    .in("passport_id", passportIds)
    .order("redeemed_at", { ascending: false })
    .returns<Redemption[]>();
  const list = redemptions ?? [];

  const offerIds = [...new Set(list.map((r) => r.offer_id))];
  const { data: offers } = offerIds.length
    ? await supabase.from("offers").select("*").in("id", offerIds).returns<Offer[]>()
    : { data: [] as Offer[] };
  const businessIds = [...new Set((offers ?? []).map((o) => o.business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name").in("id", businessIds)
    : { data: [] as { id: string; name: string }[] };

  const offerById = new Map((offers ?? []).map((o) => [o.id, o]));
  const businessNameById = new Map((businesses ?? []).map((b) => [b.id as string, b.name as string]));

  return list.map((r) => {
    const offer = offerById.get(r.offer_id);
    return {
      ...r,
      offerTitle: offer?.title ?? "Unknown offer",
      businessName: offer ? businessNameById.get(offer.business_id) ?? "Unknown business" : "Unknown business",
    };
  });
}

export async function getFavoriteBusinessesForHolder(userId: string): Promise<BusinessWithLocation[]> {
  const supabase = await createClient();
  const { data: favorites } = await supabase
    .from("business_favorites")
    .select("*")
    .eq("user_id", userId)
    .returns<BusinessFavorite[]>();
  const businessIds = (favorites ?? []).map((f) => f.business_id);
  if (businessIds.length === 0) return [];

  const { data: businesses } = await supabase.from("businesses").select("*").in("id", businessIds).returns<Business[]>();
  return attachLocations(businesses ?? []);
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

export interface DashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  featuredBusinesses: number;
  totalOffers: number;
  activeOffers: number;
  // Passports are state-wide by design (no area column) — only meaningful
  // when the scope resolves to one clean state. null means "not
  // applicable at this scope" (an area-only or multi-state manager).
  totalPassportHolders: number | null;
  totalRedemptions: number;
  todaysRedemptions: number;
  thisMonthsRedemptions: number;
  businessesPendingApproval: number;
}

export async function getDashboardMetrics(
  opts: { stateId?: string; areaIds?: string[] } = {}
): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const scopedAreaIds: string[] | null = opts.stateId
    ? await getAreaIdsForState(opts.stateId)
    : (opts.areaIds ?? null);

  let businessesQuery = supabase.from("businesses").select("id, status, featured, approval_status");
  if (scopedAreaIds) {
    businessesQuery = businessesQuery.in("passport_area_id", scopedAreaIds.length ? scopedAreaIds : [NO_MATCH_ID]);
  }
  const { data: businessRows } = await businessesQuery;
  const businesses = businessRows ?? [];
  const businessIds = businesses.map((b) => b.id as string);

  let offers: { id: string; status: string }[] = [];
  if (scopedAreaIds) {
    if (businessIds.length) {
      const { data } = await supabase.from("offers").select("id, status").in("business_id", businessIds);
      offers = data ?? [];
    }
  } else {
    const { data } = await supabase.from("offers").select("id, status");
    offers = data ?? [];
  }
  const offerIds = offers.map((o) => o.id);

  // Redemptions scope via the business/offer chain regardless of
  // granularity (state or a subset of areas within it) — precise either
  // way, unlike passports below.
  let redemptions: { redeemed_at: string }[] = [];
  if (scopedAreaIds) {
    if (offerIds.length) {
      const { data } = await supabase.from("redemptions").select("redeemed_at").in("offer_id", offerIds);
      redemptions = data ?? [];
    }
  } else {
    const { data } = await supabase.from("redemptions").select("redeemed_at");
    redemptions = data ?? [];
  }

  let totalPassportHolders: number | null = null;
  if (opts.stateId) {
    const { data } = await supabase.from("passports").select("id").eq("state_id", opts.stateId);
    totalPassportHolders = (data ?? []).length;
  } else if (!opts.areaIds) {
    const { data } = await supabase.from("passports").select("id");
    totalPassportHolders = (data ?? []).length;
  }

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return {
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((b) => b.status === "active").length,
    featuredBusinesses: businesses.filter((b) => b.featured).length,
    businessesPendingApproval: businesses.filter((b) => b.approval_status === "pending_review").length,
    totalOffers: offers.length,
    activeOffers: offers.filter((o) => o.status === "active").length,
    totalPassportHolders,
    totalRedemptions: redemptions.length,
    todaysRedemptions: redemptions.filter((r) => new Date(r.redeemed_at) >= startOfToday).length,
    thisMonthsRedemptions: redemptions.filter((r) => new Date(r.redeemed_at) >= startOfMonth).length,
  };
}
