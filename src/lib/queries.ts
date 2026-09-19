import { createClient } from "@/lib/supabase/server";
import type {
  Business,
  Category,
  NotificationPreferences,
  Offer,
  Passport,
  PassportArea,
  PassportProduct,
  RegionEvent,
  RegionEventType,
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

// States with at least one live perk — an active offer at an active
// business in an active region. Used to decide whether clicking a state
// (on the map or in the list) can go straight to it, or should instead
// collect a "notify me" signup, so nobody lands on an empty state page.
export async function getStateIdsWithLivePerks(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: offers } = await supabase.from("offers").select("business_id").eq("status", "active");
  const businessIds = [...new Set((offers ?? []).map((o) => o.business_id as string))];
  if (businessIds.length === 0) return new Set();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("passport_area_id")
    .in("id", businessIds)
    .eq("status", "active");
  const areaIds = [...new Set((businesses ?? []).map((b) => b.passport_area_id as string))];
  if (areaIds.length === 0) return new Set();

  const { data: areas } = await supabase
    .from("passport_areas")
    .select("state_id")
    .in("id", areaIds)
    .eq("status", "active");
  return new Set((areas ?? []).map((a) => a.state_id as string));
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
  opts: { subareaId?: string; categoryId?: string; q?: string; featured?: boolean } = {}
) {
  const supabase = await createClient();
  let query = supabase
    .from("businesses")
    .select("*")
    .eq("passport_area_id", areaId)
    .order("name");
  if (opts.subareaId) query = query.eq("subarea_id", opts.subareaId);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  if (opts.featured) query = query.eq("featured", true);
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

// The one offer each business's tile advertises — the business's own most
// recently created active offer. RLS ("offers: public read active")
// already limits this to active offers regardless of who's asking.
export async function getPrimaryOffersForBusinesses(
  businessIds: string[]
): Promise<Map<string, Offer>> {
  if (businessIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select("*")
    .in("business_id", businessIds)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<Offer[]>();

  const byBusiness = new Map<string, Offer>();
  for (const offer of data ?? []) {
    if (!byBusiness.has(offer.business_id)) byBusiness.set(offer.business_id, offer);
  }
  return byBusiness;
}

export async function getCategories(stateIds?: string[]) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("sort_order");
  if (stateIds) query = query.in("state_id", stateIds);
  const { data } = await query.returns<Category[]>();
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

export async function hasAnyPassport(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passports")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1);
  return Boolean(data?.length);
}

export async function getFavoritedBusinessIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("business_favorites").select("business_id").eq("user_id", userId);
  return new Set((data ?? []).map((f) => f.business_id as string));
}

// "Does this user have a redeemable Passport for this region" — checks both
// status and expires_at since nothing in this app sweeps status on expiry.
export async function getActivePassportForArea(userId: string, areaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passports")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("passport_area_id", areaId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("purchased_at", { ascending: false })
    .limit(1)
    .maybeSingle<Passport>();
  return data;
}

export interface RegionEventWithDetails extends RegionEvent {
  businessName: string;
  businessSlug: string;
  areaSlug: string;
  stateSlug: string;
  offerTitle: string | null;
}

// The passport holder's "New business added"/"New promotion added" feed —
// scoped to the region(s) their own passports are for, and filtered by
// their notification_preferences.
export async function getRegionEventsForUser(userId: string): Promise<RegionEventWithDetails[]> {
  const supabase = await createClient();

  const [{ data: passports }, { data: profile }] = await Promise.all([
    supabase.from("passports").select("passport_area_id").eq("owner_user_id", userId),
    supabase.from("profiles").select("notification_preferences").eq("id", userId).maybeSingle(),
  ]);
  const areaIds = [...new Set((passports ?? []).map((p) => p.passport_area_id as string))];
  if (areaIds.length === 0) return [];

  const prefs = (profile?.notification_preferences as NotificationPreferences | undefined) ?? undefined;
  const wantedTypes: RegionEventType[] = [
    ...(prefs?.new_business_added ?? true ? (["new_business"] as const) : []),
    ...(prefs?.new_promotion_added ?? true ? (["new_offer"] as const) : []),
  ];
  if (wantedTypes.length === 0) return [];

  const { data: events } = await supabase
    .from("region_events")
    .select("*")
    .in("passport_area_id", areaIds)
    .in("event_type", wantedTypes)
    .order("created_at", { ascending: false })
    .returns<RegionEvent[]>();
  const list = events ?? [];
  if (list.length === 0) return [];

  const businessIds = [...new Set(list.map((e) => e.business_id).filter((id): id is string => Boolean(id)))];
  const offerIds = [...new Set(list.map((e) => e.offer_id).filter((id): id is string => Boolean(id)))];

  const [{ data: businesses }, { data: offers }, { data: areas }, { data: states }] = await Promise.all([
    businessIds.length
      ? supabase.from("businesses").select("id, name, slug, passport_area_id").in("id", businessIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string; passport_area_id: string }[] }),
    offerIds.length
      ? supabase.from("offers").select("id, title").in("id", offerIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    supabase.from("passport_areas").select("id, slug, state_id").in("id", areaIds),
    supabase.from("states").select("id, slug"),
  ]);

  const businessById = new Map((businesses ?? []).map((b) => [b.id as string, b]));
  const offerTitleById = new Map((offers ?? []).map((o) => [o.id as string, o.title as string]));
  const areaById = new Map((areas ?? []).map((a) => [a.id as string, a]));
  const stateSlugById = new Map((states ?? []).map((s) => [s.id as string, s.slug as string]));

  return list
    .map((e) => {
      const business = e.business_id ? businessById.get(e.business_id) : undefined;
      if (!business) return null;
      const area = areaById.get(business.passport_area_id as string);
      const stateSlug = area ? stateSlugById.get(area.state_id as string) : undefined;
      if (!area || !stateSlug) return null;
      return {
        ...e,
        businessName: business.name as string,
        businessSlug: business.slug as string,
        areaSlug: area.slug as string,
        stateSlug,
        offerTitle: e.offer_id ? (offerTitleById.get(e.offer_id) ?? null) : null,
      };
    })
    .filter((e): e is RegionEventWithDetails => e !== null);
}

export async function getNotificationsLastReadAt(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("notifications_last_read_at")
    .eq("id", userId)
    .maybeSingle();
  return (data?.notifications_last_read_at as string | null) ?? null;
}

export interface SubareaVisitProgress {
  subarea: Subarea;
  totalBusinesses: number;
  visitedBusinesses: number;
}

// "Visited" has no dedicated tracking in this app — a redemption at a
// business is the only real signal available, so that's what this counts.
export async function getAreaVisitProgress(areaId: string, userId: string): Promise<SubareaVisitProgress[]> {
  const supabase = await createClient();

  const [subareas, { data: businesses }, { data: passports }] = await Promise.all([
    getSubareasForArea(areaId),
    supabase.from("businesses").select("id, subarea_id").eq("passport_area_id", areaId),
    supabase.from("passports").select("id").eq("owner_user_id", userId).eq("passport_area_id", areaId),
  ]);

  const passportIds = (passports ?? []).map((p) => p.id as string);
  let redeemedBusinessIds = new Set<string>();
  if (passportIds.length > 0) {
    const { data: redemptions } = await supabase
      .from("redemptions")
      .select("offer_id")
      .in("passport_id", passportIds);
    const offerIds = [...new Set((redemptions ?? []).map((r) => r.offer_id as string))];
    if (offerIds.length > 0) {
      const { data: offers } = await supabase.from("offers").select("id, business_id").in("id", offerIds);
      redeemedBusinessIds = new Set((offers ?? []).map((o) => o.business_id as string));
    }
  }

  return subareas.map((subarea) => {
    const subareaBusinesses = (businesses ?? []).filter((b) => b.subarea_id === subarea.id);
    const visited = subareaBusinesses.filter((b) => redeemedBusinessIds.has(b.id as string)).length;
    return { subarea, totalBusinesses: subareaBusinesses.length, visitedBusinesses: visited };
  });
}

export interface AchievementProgress {
  key: string;
  name: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

// A small, honest, hardcoded catalog computed from data that already
// exists — not a per-business badge system with an admin-configurable
// catalog, which wasn't asked for and would be a feature of its own.
export async function getAchievementProgress(userId: string): Promise<AchievementProgress[]> {
  const supabase = await createClient();

  const { data: passports } = await supabase.from("passports").select("id").eq("owner_user_id", userId);
  const passportIds = (passports ?? []).map((p) => p.id as string);

  let redemptionCount = 0;
  let uniqueBusinessCount = 0;
  if (passportIds.length > 0) {
    const { data: redemptions } = await supabase
      .from("redemptions")
      .select("offer_id")
      .in("passport_id", passportIds);
    redemptionCount = (redemptions ?? []).length;
    const offerIds = [...new Set((redemptions ?? []).map((r) => r.offer_id as string))];
    if (offerIds.length > 0) {
      const { data: offers } = await supabase.from("offers").select("business_id").in("id", offerIds);
      uniqueBusinessCount = new Set((offers ?? []).map((o) => o.business_id as string)).size;
    }
  }

  const { count: favoriteCount } = await supabase
    .from("business_favorites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const catalog: Omit<AchievementProgress, "unlocked">[] = [
    {
      key: "first_redemption",
      name: "First Redemption",
      description: "Redeem your first Passport perk.",
      current: Math.min(redemptionCount, 1),
      target: 1,
    },
    {
      key: "explorer",
      name: "Explorer",
      description: "Visit 5 different participating businesses.",
      current: Math.min(uniqueBusinessCount, 5),
      target: 5,
    },
    {
      key: "super_saver",
      name: "Super Saver",
      description: "Redeem 10 Passport perks.",
      current: Math.min(redemptionCount, 10),
      target: 10,
    },
    {
      key: "local_favorite",
      name: "Local Favorite",
      description: "Save 5 businesses to your favorites.",
      current: Math.min(favoriteCount ?? 0, 5),
      target: 5,
    },
  ];

  return catalog.map((a) => ({ ...a, unlocked: a.current >= a.target }));
}

export async function getActivePassportProductForArea(areaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passport_products")
    .select("*")
    .eq("status", "active")
    .eq("passport_area_id", areaId)
    .order("price_cents")
    .limit(1)
    .maybeSingle<PassportProduct>();
  return data;
}
