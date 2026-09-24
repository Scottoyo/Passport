import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Business, Offer } from "@/lib/types/domain";

// Every business a signed-in user owns (created_by) or staffs (local_staff),
// RLS-backed by the owner/staff policies in 0032 — this is what decides
// whether /portal auto-redirects into one business or shows a picker.
export async function getPortalBusinessesForUser(userId: string): Promise<Business[]> {
  const supabase = await createClient();

  const [{ data: owned }, { data: staffRows }] = await Promise.all([
    supabase.from("businesses").select("*").eq("created_by", userId).returns<Business[]>(),
    supabase.from("local_staff").select("business_id").eq("user_id", userId),
  ]);

  const staffBusinessIds = (staffRows ?? [])
    .map((r) => r.business_id as string | null)
    .filter((id): id is string => Boolean(id));

  let staffed: Business[] = [];
  if (staffBusinessIds.length) {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .in("id", staffBusinessIds)
      .returns<Business[]>();
    staffed = data ?? [];
  }

  const byId = new Map<string, Business>();
  for (const b of [...(owned ?? []), ...staffed]) byId.set(b.id, b);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Unlike RLS (which also lets managers/admins read a business), the portal
// itself is only for the business's own owner/staff — they have the real
// admin panel for anything else. Checked explicitly here rather than
// trusting "RLS let the row through" as a proxy for portal access.
export async function getPortalBusinessAccess(
  userId: string,
  businessId: string
): Promise<Business | null> {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle<Business>();
  if (!business) return null;
  if (business.created_by === userId) return business;

  const { data: staffRow } = await supabase
    .from("local_staff")
    .select("id")
    .eq("user_id", userId)
    .or(`business_id.eq.${businessId},business_id.is.null`)
    .maybeSingle();
  return staffRow ? business : null;
}

export interface BusinessMetrics {
  totalRedemptions: number;
  redemptionsLast30Days: number;
  mostRedeemedOfferLast30Days: string | null;
  uniqueCustomers: number;
}

export async function getBusinessMetrics(businessId: string): Promise<BusinessMetrics> {
  const supabase = await createClient();

  const { data: offers } = await supabase.from("offers").select("id, title").eq("business_id", businessId);
  const offerIds = (offers ?? []).map((o) => o.id as string);
  const offerTitleById = new Map((offers ?? []).map((o) => [o.id as string, o.title as string]));

  if (offerIds.length === 0) {
    return { totalRedemptions: 0, redemptionsLast30Days: 0, mostRedeemedOfferLast30Days: null, uniqueCustomers: 0 };
  }

  const { data: redemptions } = await supabase
    .from("redemptions")
    .select("offer_id, passport_id, redeemed_at")
    .in("offer_id", offerIds);
  const rows = redemptions ?? [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = rows.filter((r) => new Date(r.redeemed_at as string) >= thirtyDaysAgo);

  const recentCountByOffer = new Map<string, number>();
  for (const r of recent) {
    const offerId = r.offer_id as string;
    recentCountByOffer.set(offerId, (recentCountByOffer.get(offerId) ?? 0) + 1);
  }
  let mostRedeemedOfferLast30Days: string | null = null;
  let topCount = 0;
  for (const [offerId, count] of recentCountByOffer) {
    if (count > topCount) {
      topCount = count;
      mostRedeemedOfferLast30Days = offerTitleById.get(offerId) ?? null;
    }
  }

  return {
    totalRedemptions: rows.length,
    redemptionsLast30Days: recent.length,
    mostRedeemedOfferLast30Days,
    uniqueCustomers: new Set(rows.map((r) => r.passport_id as string)).size,
  };
}

export interface BusinessRedemption {
  id: string;
  offerTitle: string;
  redeemedAt: string;
}

export async function getRedemptionsForBusiness(businessId: string): Promise<BusinessRedemption[]> {
  const supabase = await createClient();
  const { data: offers } = await supabase.from("offers").select("id, title").eq("business_id", businessId);
  const offerIds = (offers ?? []).map((o) => o.id as string);
  const offerTitleById = new Map((offers ?? []).map((o) => [o.id as string, o.title as string]));
  if (offerIds.length === 0) return [];

  const { data: redemptions } = await supabase
    .from("redemptions")
    .select("id, offer_id, redeemed_at")
    .in("offer_id", offerIds)
    .order("redeemed_at", { ascending: false });

  return (redemptions ?? []).map((r) => ({
    id: r.id as string,
    offerTitle: offerTitleById.get(r.offer_id as string) ?? "Unknown offer",
    redeemedAt: r.redeemed_at as string,
  }));
}

export type OfferIneligibleReason = "not_active" | "limit_reached";

export interface RedeemableOffer {
  offer: Offer;
  eligible: boolean;
  reason: OfferIneligibleReason | null;
}

// Plain, already-RLS-legal queries (0032_business_portal.sql) — no RPC
// needed for reads, only the write path (confirm_manual_redemption) needs
// security definer. The redemption count intentionally counts BOTH
// redemption methods together, same cap redeem_offer enforces.
export async function getRedeemableOffersForPassport(
  businessId: string,
  passportId: string
): Promise<RedeemableOffer[]> {
  const supabase = await createClient();

  const [{ data: offers }, { data: redemptions }] = await Promise.all([
    supabase.from("offers").select("*").eq("business_id", businessId).returns<Offer[]>(),
    supabase.from("redemptions").select("offer_id").eq("passport_id", passportId),
  ]);

  const redemptionCountByOffer = new Map<string, number>();
  for (const r of redemptions ?? []) {
    const offerId = r.offer_id as string;
    redemptionCountByOffer.set(offerId, (redemptionCountByOffer.get(offerId) ?? 0) + 1);
  }

  return (offers ?? []).map((offer) => {
    if (offer.status !== "active") {
      return { offer, eligible: false, reason: "not_active" as const };
    }
    const cap = offer.redemptions_per_passport;
    if (cap !== null && (redemptionCountByOffer.get(offer.id) ?? 0) >= cap) {
      return { offer, eligible: false, reason: "limit_reached" as const };
    }
    return { offer, eligible: true, reason: null };
  });
}
