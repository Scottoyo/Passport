import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAreaIdsForState, NO_MATCH_ID } from "@/lib/admin-scope";
import { formatPassportNumber } from "@/lib/format";
import type {
  AdminNotification,
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
  areaName: string | null;
}

async function attachOwners(passports: Passport[]): Promise<PassportWithOwner[]> {
  const supabase = await createClient();
  const ownerIds = [...new Set(passports.map((p) => p.owner_user_id))];
  const stateIds = [...new Set(passports.map((p) => p.state_id))];
  const areaIds = [...new Set(passports.map((p) => p.passport_area_id))];
  const [{ data: profiles }, { data: states }, { data: areas }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("*").in("id", ownerIds).returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
    stateIds.length
      ? supabase.from("states").select("id, name").in("id", stateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    areaIds.length
      ? supabase.from("passport_areas").select("id, name").in("id", areaIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const stateNameById = new Map((states ?? []).map((s) => [s.id as string, s.name as string]));
  const areaNameById = new Map((areas ?? []).map((a) => [a.id as string, a.name as string]));
  return passports.map((p) => ({
    ...p,
    owner: profileById.get(p.owner_user_id) ?? null,
    stateName: stateNameById.get(p.state_id) ?? null,
    areaName: areaNameById.get(p.passport_area_id) ?? null,
  }));
}

export async function getPassportsWithHolders(
  opts: { stateId?: string; stateIds?: string[]; areaIds?: string[]; expiredOnly?: boolean } = {}
): Promise<PassportWithOwner[]> {
  const supabase = await createClient();
  let query = supabase.from("passports").select("*").order("purchased_at", { ascending: false });

  if (opts.stateId) {
    query = query.eq("state_id", opts.stateId);
  } else if (opts.stateIds) {
    query = query.in("state_id", opts.stateIds.length ? opts.stateIds : [NO_MATCH_ID]);
  } else if (opts.areaIds) {
    query = query.in("passport_area_id", opts.areaIds.length ? opts.areaIds : [NO_MATCH_ID]);
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
  areaName: string | null;
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
  const areaIds = [...new Set(passports.map((p) => p.passport_area_id))];
  const productIds = [...new Set(passports.map((p) => p.passport_product_id))];
  const [{ data: states }, { data: areas }, { data: products }] = await Promise.all([
    stateIds.length
      ? supabase.from("states").select("*").in("id", stateIds).returns<State[]>()
      : Promise.resolve({ data: [] as State[] }),
    areaIds.length
      ? supabase.from("passport_areas").select("*").in("id", areaIds).returns<PassportArea[]>()
      : Promise.resolve({ data: [] as PassportArea[] }),
    productIds.length
      ? supabase.from("passport_products").select("*").in("id", productIds).returns<PassportProduct[]>()
      : Promise.resolve({ data: [] as PassportProduct[] }),
  ]);
  const stateById = new Map((states ?? []).map((s) => [s.id, s]));
  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  return passports.map((p) => ({
    ...p,
    stateName: stateById.get(p.state_id)?.name ?? null,
    areaName: areaById.get(p.passport_area_id)?.name ?? null,
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
  stateId: string | null;
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
    return { ...b, areaName: area?.name ?? null, stateName: state?.name ?? null, stateId: state?.id ?? null };
  });
}

export async function getAllBusinessesNational(
  opts: { stateId?: string; stateIds?: string[]; areaIds?: string[] } = {}
): Promise<BusinessWithLocation[]> {
  const supabase = await createClient();
  let query = supabase.from("businesses").select("*").order("name");

  if (opts.stateId) {
    const areaIds = await getAreaIdsForState(opts.stateId);
    query = query.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  } else if (opts.stateIds) {
    const areaIdLists = await Promise.all(opts.stateIds.map((id) => getAreaIdsForState(id)));
    const areaIds = areaIdLists.flat();
    query = query.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  } else if (opts.areaIds) {
    query = query.in("passport_area_id", opts.areaIds.length ? opts.areaIds : [NO_MATCH_ID]);
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
  opts: { stateId?: string; areaIds?: string[] } = {}
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
  } else if (opts.areaIds) {
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id")
      .in("passport_area_id", opts.areaIds.length ? opts.areaIds : [NO_MATCH_ID]);
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

export interface DashboardLeaderboards {
  topBusinesses: { id: string; name: string; areaName: string | null; activeOfferCount: number; redemptions: number }[];
  businessesNoRedemptions: { id: string; name: string; areaName: string | null }[];
  topOffers: { id: string; title: string; businessName: string; redemptions: number }[];
  offersNoRedemptions: { id: string; title: string; businessName: string }[];
  topPassportHolders: { profileId: string; holderName: string; passportNumber: string; redemptions: number }[];
  topGeographicAreas: { subareaId: string; name: string; businessCount: number; redemptions: number }[];
}

const LEADERBOARD_LIMIT = 10;

// Six top-10 leaderboards for the admin dashboard, scoped the same way as
// getDashboardMetrics (stateId -> getAreaIdsForState, else areaIds ?? null
// for nationwide). No DB-side GROUP BY/RPC exists anywhere in this codebase
// yet, so this follows the same convention getDashboardMetrics already
// uses: fetch minimal-column scoped rows, then count/group in JS via Maps
// built once and reused across every section.
export async function getDashboardLeaderboards(
  opts: { stateId?: string; areaIds?: string[] } = {}
): Promise<DashboardLeaderboards> {
  const supabase = await createClient();

  const scopedAreaIds: string[] | null = opts.stateId
    ? await getAreaIdsForState(opts.stateId)
    : (opts.areaIds ?? null);

  let businessesQuery = supabase
    .from("businesses")
    .select("id, name, status, passport_area_id, subarea_id");
  if (scopedAreaIds) {
    businessesQuery = businessesQuery.in("passport_area_id", scopedAreaIds.length ? scopedAreaIds : [NO_MATCH_ID]);
  }
  const { data: businessRows } = await businessesQuery;
  const businesses = businessRows ?? [];
  const businessIds = businesses.map((b) => b.id as string);

  const { data: offerRows } = businessIds.length
    ? await supabase.from("offers").select("id, business_id, title, status").in("business_id", businessIds)
    : { data: [] as { id: string; business_id: string; title: string; status: string }[] };
  const offers = offerRows ?? [];
  const offerIds = offers.map((o) => o.id as string);

  const { data: redemptionRows } = offerIds.length
    ? await supabase.from("redemptions").select("offer_id, passport_id").in("offer_id", offerIds)
    : { data: [] as { offer_id: string; passport_id: string }[] };
  const redemptions = redemptionRows ?? [];

  const areaIdsForNames = [...new Set(businesses.map((b) => b.passport_area_id as string))];
  const { data: areaRows } = areaIdsForNames.length
    ? await supabase.from("passport_areas").select("id, name").in("id", areaIdsForNames)
    : { data: [] as { id: string; name: string }[] };
  const areaNameById = new Map((areaRows ?? []).map((a) => [a.id as string, a.name as string]));

  const subareaIdsForNames = [...new Set(businesses.map((b) => b.subarea_id as string | null).filter(Boolean))] as string[];
  const { data: subareaRows } = subareaIdsForNames.length
    ? await supabase.from("subareas").select("id, name").in("id", subareaIdsForNames)
    : { data: [] as { id: string; name: string }[] };
  const subareaNameById = new Map((subareaRows ?? []).map((s) => [s.id as string, s.name as string]));

  const redemptionsByOffer = new Map<string, number>();
  const redemptionsByPassport = new Map<string, number>();
  for (const r of redemptions) {
    const offerId = r.offer_id as string;
    const passportId = r.passport_id as string;
    redemptionsByOffer.set(offerId, (redemptionsByOffer.get(offerId) ?? 0) + 1);
    redemptionsByPassport.set(passportId, (redemptionsByPassport.get(passportId) ?? 0) + 1);
  }

  const businessById = new Map(businesses.map((b) => [b.id as string, b]));
  const redemptionsByBusiness = new Map<string, number>();
  const activeOfferCountByBusiness = new Map<string, number>();
  for (const o of offers) {
    const businessId = o.business_id as string;
    const count = redemptionsByOffer.get(o.id as string) ?? 0;
    redemptionsByBusiness.set(businessId, (redemptionsByBusiness.get(businessId) ?? 0) + count);
    if (o.status === "active") {
      activeOfferCountByBusiness.set(businessId, (activeOfferCountByBusiness.get(businessId) ?? 0) + 1);
    }
  }

  const topBusinesses = businesses
    .map((b) => ({
      id: b.id as string,
      name: b.name as string,
      areaName: areaNameById.get(b.passport_area_id as string) ?? null,
      activeOfferCount: activeOfferCountByBusiness.get(b.id as string) ?? 0,
      redemptions: redemptionsByBusiness.get(b.id as string) ?? 0,
    }))
    .filter((b) => b.redemptions > 0)
    .sort((a, b) => b.redemptions - a.redemptions)
    .slice(0, LEADERBOARD_LIMIT);

  const businessesNoRedemptions = businesses
    .filter((b) => b.status === "active" && (redemptionsByBusiness.get(b.id as string) ?? 0) === 0)
    .map((b) => ({
      id: b.id as string,
      name: b.name as string,
      areaName: areaNameById.get(b.passport_area_id as string) ?? null,
    }))
    .slice(0, LEADERBOARD_LIMIT);

  const topOffers = offers
    .map((o) => ({
      id: o.id as string,
      title: o.title as string,
      businessName: (businessById.get(o.business_id as string)?.name as string) ?? "Unknown business",
      redemptions: redemptionsByOffer.get(o.id as string) ?? 0,
    }))
    .filter((o) => o.redemptions > 0)
    .sort((a, b) => b.redemptions - a.redemptions)
    .slice(0, LEADERBOARD_LIMIT);

  const offersNoRedemptions = offers
    .filter((o) => o.status === "active" && (redemptionsByOffer.get(o.id as string) ?? 0) === 0)
    .map((o) => ({
      id: o.id as string,
      title: o.title as string,
      businessName: (businessById.get(o.business_id as string)?.name as string) ?? "Unknown business",
    }))
    .slice(0, LEADERBOARD_LIMIT);

  const passportIds = [...redemptionsByPassport.keys()];
  const { data: passportRows } = passportIds.length
    ? await supabase.from("passports").select("id, owner_user_id, passport_number").in("id", passportIds)
    : { data: [] as { id: string; owner_user_id: string; passport_number: string }[] };
  const passports = passportRows ?? [];
  const ownerIds = [...new Set(passports.map((p) => p.owner_user_id as string))];
  const { data: profileRows } = ownerIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const profileById = new Map((profileRows ?? []).map((p) => [p.id as string, p]));

  const topPassportHolders = passports
    .map((p) => {
      const owner = profileById.get(p.owner_user_id as string);
      return {
        profileId: p.owner_user_id as string,
        holderName: owner?.full_name || owner?.email || "Unknown holder",
        passportNumber: formatPassportNumber(p.passport_number as string),
        redemptions: redemptionsByPassport.get(p.id as string) ?? 0,
      };
    })
    .sort((a, b) => b.redemptions - a.redemptions)
    .slice(0, LEADERBOARD_LIMIT);

  const businessCountBySubarea = new Map<string, number>();
  const redemptionsBySubarea = new Map<string, number>();
  for (const b of businesses) {
    const subareaId = b.subarea_id as string | null;
    if (!subareaId) continue;
    businessCountBySubarea.set(subareaId, (businessCountBySubarea.get(subareaId) ?? 0) + 1);
    redemptionsBySubarea.set(
      subareaId,
      (redemptionsBySubarea.get(subareaId) ?? 0) + (redemptionsByBusiness.get(b.id as string) ?? 0)
    );
  }

  const topGeographicAreas = [...businessCountBySubarea.keys()]
    .map((subareaId) => ({
      subareaId,
      name: subareaNameById.get(subareaId) ?? "Unknown area",
      businessCount: businessCountBySubarea.get(subareaId) ?? 0,
      redemptions: redemptionsBySubarea.get(subareaId) ?? 0,
    }))
    .sort((a, b) => b.redemptions - a.redemptions || b.businessCount - a.businessCount)
    .slice(0, LEADERBOARD_LIMIT);

  return {
    topBusinesses,
    businessesNoRedemptions,
    topOffers,
    offersNoRedemptions,
    topPassportHolders,
    topGeographicAreas,
  };
}

export interface AdminNotificationWithDetails extends AdminNotification {
  areaName: string;
  businessName: string | null;
  businessSlug: string | null;
  marketingRequestTitle: string | null;
}

// The manager equivalent of getRegionEventsForUser (src/lib/queries.ts) —
// scoped by the caller's current admin scope (getAdminScopedAreaIds in
// admin-scope.ts) instead of a passport holder's own regions. `areaIds ===
// null` means "no scope narrowing" (a national admin viewing everything).
export async function getAdminNotifications(areaIds: string[] | null): Promise<AdminNotificationWithDetails[]> {
  const supabase = await createClient();

  let query = supabase.from("admin_notifications").select("*").order("created_at", { ascending: false });
  if (areaIds) {
    query = query.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  }
  const { data: notifications } = await query.returns<AdminNotification[]>();
  const list = notifications ?? [];
  if (list.length === 0) return [];

  const businessIds = [...new Set(list.map((n) => n.business_id).filter((id): id is string => Boolean(id)))];
  const marketingRequestIds = [
    ...new Set(list.map((n) => n.marketing_request_id).filter((id): id is string => Boolean(id))),
  ];
  const areaIdsToLoad = [...new Set(list.map((n) => n.passport_area_id))];

  const [{ data: businesses }, { data: marketingRequests }, { data: areas }] = await Promise.all([
    businessIds.length
      ? supabase.from("businesses").select("id, name, slug").in("id", businessIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    marketingRequestIds.length
      ? supabase.from("marketing_requests").select("id, title, business_id").in("id", marketingRequestIds)
      : Promise.resolve({ data: [] as { id: string; title: string; business_id: string | null }[] }),
    supabase.from("passport_areas").select("id, name").in("id", areaIdsToLoad),
  ]);

  // Marketing-request notifications don't store business_id directly (only
  // marketing_request_id) - resolve the request's own business separately so
  // its notification can still show a business name rather than falling
  // back to the area.
  const marketingRequestById = new Map((marketingRequests ?? []).map((m) => [m.id as string, m]));
  const marketingBusinessIds = [
    ...new Set((marketingRequests ?? []).map((m) => m.business_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: marketingBusinesses } = marketingBusinessIds.length
    ? await supabase.from("businesses").select("id, name").in("id", marketingBusinessIds)
    : { data: [] as { id: string; name: string }[] };
  const marketingBusinessNameById = new Map((marketingBusinesses ?? []).map((b) => [b.id as string, b.name as string]));

  const businessById = new Map((businesses ?? []).map((b) => [b.id as string, b]));
  const marketingTitleById = new Map((marketingRequests ?? []).map((m) => [m.id as string, m.title as string]));
  const areaNameById = new Map((areas ?? []).map((a) => [a.id as string, a.name as string]));

  return list.map((n) => {
    const business = n.business_id
      ? businessById.get(n.business_id)
      : n.marketing_request_id
        ? (() => {
            const request = marketingRequestById.get(n.marketing_request_id!);
            const name = request?.business_id ? marketingBusinessNameById.get(request.business_id) : undefined;
            return name ? { name, slug: null } : undefined;
          })()
        : undefined;
    return {
      ...n,
      areaName: areaNameById.get(n.passport_area_id) ?? "Unknown area",
      businessName: (business?.name as string) ?? null,
      businessSlug: (business?.slug as string) ?? null,
      marketingRequestTitle: n.marketing_request_id ? (marketingTitleById.get(n.marketing_request_id) ?? null) : null,
    };
  });
}

export async function getAdminNotificationsLastReadAt(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("admin_notifications_last_read_at")
    .eq("id", userId)
    .maybeSingle();
  return (data?.admin_notifications_last_read_at as string | null) ?? null;
}

export interface ReferralReportRow {
  referrerId: string;
  code: string;
  name: string;
  uses: number;
  revenueCents: number;
  payoutOwedCents: number;
  payoutPaidCents: number;
  payoutRateCents: number;
  suspended: boolean;
}

// Passport holder referrals ("Referral program") and business referrals
// ("Business passport sales") are mechanically identical - one column on
// passports differs (referred_by_profile_id vs referred_by_business_id),
// one lookup table differs (profiles vs businesses) - so both admin pages
// share this one query rather than duplicating the aggregation logic.
export async function getReferralReport(
  kind: "profile" | "business",
  areaIds: string[] | null
): Promise<ReferralReportRow[]> {
  const supabase = await createClient();
  const referrerColumn: string = kind === "profile" ? "referred_by_profile_id" : "referred_by_business_id";
  const passportSelectColumns: string = `id, passport_area_id, amount_paid_cents, referral_payout_cents, referral_payout_paid_at, ${referrerColumn}`;

  let query = supabase
    .from("passports")
    .select(passportSelectColumns)
    .not(referrerColumn, "is", null);
  if (areaIds) {
    query = query.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  }
  const { data: passportRows } = await query;
  const rows = (passportRows ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const referrerIds = [...new Set(rows.map((r) => r[referrerColumn] as string))];
  const table: string = kind === "profile" ? "profiles" : "businesses";
  const nameColumns: string = kind === "profile" ? "full_name, email" : "name";
  const selectColumns: string = `id, referral_code, referral_payout_rate_cents, referral_suspended_at, ${nameColumns}`;
  const { data: referrerRows } = await supabase
    .from(table)
    .select(selectColumns)
    .in("id", referrerIds);
  const referrerById = new Map(
    ((referrerRows ?? []) as unknown as Record<string, unknown>[]).map((r) => [r.id as string, r])
  );

  const grouped = new Map<string, { uses: number; revenue: number; owed: number; paid: number }>();
  for (const p of rows) {
    const id = p[referrerColumn] as string;
    const g = grouped.get(id) ?? { uses: 0, revenue: 0, owed: 0, paid: 0 };
    g.uses += 1;
    g.revenue += (p.amount_paid_cents as number) ?? 0;
    if (p.referral_payout_paid_at) g.paid += (p.referral_payout_cents as number) ?? 0;
    else g.owed += (p.referral_payout_cents as number) ?? 0;
    grouped.set(id, g);
  }

  return [...grouped.entries()]
    .map(([id, g]) => {
      const referrer = referrerById.get(id);
      const name =
        kind === "profile"
          ? ((referrer?.full_name as string) || (referrer?.email as string) || "Unknown holder")
          : ((referrer?.name as string) ?? "Unknown business");
      return {
        referrerId: id,
        code: (referrer?.referral_code as string) ?? "-",
        name,
        uses: g.uses,
        revenueCents: g.revenue,
        payoutOwedCents: g.owed,
        payoutPaidCents: g.paid,
        payoutRateCents: (referrer?.referral_payout_rate_cents as number) ?? 0,
        suspended: Boolean(referrer?.referral_suspended_at),
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);
}
