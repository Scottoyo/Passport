import { createClient } from "@/lib/supabase/server";
import type {
  AchievementEvent,
  AdminAnnouncement,
  Business,
  BusinessMedia,
  Category,
  NotificationFeedItem,
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
  if (opts.featured) {
    // A featured business only shows while it's within its featured
    // window - a null bound on either side means unbounded on that side
    // (matches rows from before the windowed-featuring feature, which
    // keep showing until someone turns featured off).
    const now = new Date().toISOString();
    query = query
      .eq("featured", true)
      .or(`featured_starts_at.is.null,featured_starts_at.lte.${now}`)
      .or(`featured_ends_at.is.null,featured_ends_at.gte.${now}`);
  }
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

export async function getBusinessMedia(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_media")
    .select("*")
    .eq("business_id", businessId)
    .order("display_order", { ascending: true })
    .returns<BusinessMedia[]>();
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

// Whether a region currently has at least one published (status='active')
// offer at one of its own active businesses - the single condition that
// decides whether Home/Discover show real business content or the
// ComingSoonBusinesses section instead. Reuses getBusinessesForArea (already
// RLS-limited to active businesses for a public session) rather than a
// direct offers-to-area join, matching the two-step shape already used by
// the equivalent "active offers in my regions" check in
// src/app/account/page.tsx. Fails "open" (reports offers exist) on a query
// error so a transient failure can never surface a false "coming soon"
// pitch in place of real content.
export async function hasPublishedOffersForArea(areaId: string): Promise<boolean> {
  const businesses = await getBusinessesForArea(areaId);
  if (businesses.length === 0) return false;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .in(
      "business_id",
      businesses.map((b) => b.id)
    );
  if (error) return true;
  return (count ?? 0) > 0;
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

// The region behind /account/discover's embedded view and the header's
// "Discover" link when a signed-in customer isn't already browsing a region
// (no [state]/[area] in the URL) - their most recently purchased passport's
// region, same resolution /account/discover used to redirect to before it
// started rendering inline.
export async function getMyPrimaryRegion(
  userId: string
): Promise<{ stateSlug: string; areaSlug: string; areaName: string } | null> {
  const supabase = await createClient();
  const passports = await getMyPassports(userId);
  if (passports.length === 0) return null;

  const { data: area } = await supabase
    .from("passport_areas")
    .select("slug, name, state_id")
    .eq("id", passports[0].passport_area_id)
    .maybeSingle();
  if (!area) return null;

  const { data: state } = await supabase.from("states").select("slug").eq("id", area.state_id).maybeSingle();
  if (!state) return null;

  return { stateSlug: state.slug as string, areaSlug: area.slug as string, areaName: area.name as string };
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

// The passport holder's "New business added"/"New promotion added" feed —
// scoped to the region(s) their own passports are for. Unlike
// fetchAchievementItems/fetchAnnouncementItems below, a business-less event
// is meaningless here (there's nothing to show/link to), so this is the
// only one of the three that drops rows it can't resolve.
async function fetchRegionEventItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  areaIds: string[],
  wantedTypes: RegionEventType[]
): Promise<NotificationFeedItem[]> {
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
    .map((e): NotificationFeedItem | null => {
      const business = e.business_id ? businessById.get(e.business_id) : undefined;
      if (!business) return null;
      const area = areaById.get(business.passport_area_id as string);
      const stateSlug = area ? stateSlugById.get(area.state_id as string) : undefined;
      if (!area || !stateSlug) return null;
      return {
        id: e.id,
        event_type: e.event_type,
        created_at: e.created_at,
        businessName: business.name as string,
        businessSlug: business.slug as string,
        areaSlug: area.slug as string,
        stateSlug,
        offerTitle: e.offer_id ? (offerTitleById.get(e.offer_id) ?? null) : null,
      };
    })
    .filter((e): e is NotificationFeedItem => e !== null);
}

async function fetchAchievementItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<NotificationFeedItem[]> {
  const { data } = await supabase
    .from("achievement_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<AchievementEvent[]>();
  return (data ?? []).map((e) => {
    const meta = ACHIEVEMENT_CATALOG.find((a) => a.key === e.achievement_key);
    return {
      id: e.id,
      event_type: "achievement_unlocked",
      created_at: e.created_at,
      achievementName: meta?.name ?? e.achievement_key,
      achievementDescription: meta?.description ?? "",
    };
  });
}

async function fetchAnnouncementItems(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<NotificationFeedItem[]> {
  // RLS on admin_announcements already restricts this to exactly what the
  // signed-in user may see (a national broadcast, or their own scope as a
  // passport holder/business owner/staff, or their own admin scope) - no
  // app-side scope filtering needed.
  const { data } = await supabase
    .from("admin_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<AdminAnnouncement[]>();
  return (data ?? []).map((a) => ({
    id: a.id,
    event_type: "admin_announcement",
    created_at: a.created_at,
    announcementTitle: a.title,
    announcementBody: a.body,
  }));
}

// The passport holder/business owner's unified notification feed - merges
// three independently-sourced event kinds (region_events, achievement_events,
// admin_announcements), each filtered by the caller's own
// notification_preferences. A business owner with no personal passport still
// gets achievement/announcement items (only the region-events source needs a
// passport area to scope to).
export async function getRegionEventsForUser(userId: string): Promise<NotificationFeedItem[]> {
  const supabase = await createClient();

  const [{ data: passports }, { data: profile }] = await Promise.all([
    supabase.from("passports").select("passport_area_id").eq("owner_user_id", userId),
    supabase.from("profiles").select("notification_preferences").eq("id", userId).maybeSingle(),
  ]);
  const areaIds = [...new Set((passports ?? []).map((p) => p.passport_area_id as string))];
  const prefs = (profile?.notification_preferences as NotificationPreferences | undefined) ?? undefined;

  const wantedRegionTypes: RegionEventType[] = [
    ...(prefs?.new_business_added ?? true ? (["new_business"] as const) : []),
    ...(prefs?.new_promotion_added ?? true ? (["new_offer"] as const) : []),
  ];

  const [regionItems, achievementItems, announcementItems] = await Promise.all([
    areaIds.length > 0 && wantedRegionTypes.length > 0
      ? fetchRegionEventItems(supabase, areaIds, wantedRegionTypes)
      : Promise.resolve([] as NotificationFeedItem[]),
    (prefs?.achievement_unlocked ?? true)
      ? fetchAchievementItems(supabase, userId)
      : Promise.resolve([] as NotificationFeedItem[]),
    (prefs?.admin_announcement ?? true)
      ? fetchAnnouncementItems(supabase)
      : Promise.resolve([] as NotificationFeedItem[]),
  ]);

  return [...regionItems, ...achievementItems, ...announcementItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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
// Shared with fetchAchievementItems above for the notification feed's
// achievement name/description - and with the achievement_events triggers
// in supabase/migrations/0054_achievement_events.sql, whose thresholds must
// be kept in sync with these `target` values by hand.
const ACHIEVEMENT_CATALOG: { key: string; name: string; description: string; target: number }[] = [
  { key: "first_redemption", name: "First Redemption", description: "Redeem your first Passport perk.", target: 1 },
  { key: "explorer", name: "Explorer", description: "Visit 5 different participating businesses.", target: 5 },
  { key: "super_saver", name: "Super Saver", description: "Redeem 10 Passport perks.", target: 10 },
  { key: "local_favorite", name: "Local Favorite", description: "Save 5 businesses to your favorites.", target: 5 },
];

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

  const currentByKey: Record<string, number> = {
    first_redemption: Math.min(redemptionCount, 1),
    explorer: Math.min(uniqueBusinessCount, 5),
    super_saver: Math.min(redemptionCount, 10),
    local_favorite: Math.min(favoriteCount ?? 0, 5),
  };

  return ACHIEVEMENT_CATALOG.map((a) => {
    const current = currentByKey[a.key] ?? 0;
    return { ...a, current, unlocked: current >= a.target };
  });
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
