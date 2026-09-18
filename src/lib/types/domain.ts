// Hand-maintained types mirroring supabase/migrations/0001_schema.sql.
//
// These are intentionally hand-written rather than generated so the schema
// design stays legible in one place. Once the Supabase project is live, swap
// to `supabase gen types typescript` output and keep these as a thin
// re-export if preferred.

export type ContentStatus = "draft" | "active" | "paused" | "archived";

export interface State {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
  status: ContentStatus;
  intro_copy: string | null;
  hero_image_url: string | null;
  launched_at: string | null;
}

export interface PassportArea {
  id: string;
  state_id: string;
  name: string;
  slug: string;
  status: ContentStatus;
  tagline: string | null;
  description: string | null;
  hero_image_url: string | null;
  launched_at: string | null;
}

export interface Subarea {
  id: string;
  passport_area_id: string;
  name: string;
  slug: string;
  status: ContentStatus;
  description: string | null;
  hero_image_url: string | null;
  launched_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface Business {
  id: string;
  passport_area_id: string;
  subarea_id: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  status: ContentStatus;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website_url: string | null;
  hero_image_url: string | null;
}

export type DiscountType =
  | "percent_off"
  | "amount_off"
  | "bogo"
  | "freebie"
  | "other";

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  terms: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  redemptions_per_passport: number;
  status: ContentStatus;
  starts_at: string | null;
  ends_at: string | null;
}

export interface PassportProduct {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_days: number;
  max_members: number;
  status: ContentStatus;
}

export type PassportStatus = "active" | "expired" | "revoked";

export interface Passport {
  id: string;
  owner_user_id: string;
  passport_product_id: string;
  status: PassportStatus;
  purchased_at: string;
  expires_at: string;
  payment_reference: string | null;
}

export interface AreaAssignment {
  id: string;
  user_id: string;
  passport_area_id: string;
  can_view_metrics: boolean;
  can_manage_businesses: boolean;
  can_manage_offers: boolean;
  can_manage_subareas: boolean;
  can_submit_marketing_requests: boolean;
  can_manage_staff: boolean;
}

export type AreaCapability =
  | "view_metrics"
  | "manage_businesses"
  | "manage_offers"
  | "manage_subareas"
  | "submit_marketing_requests"
  | "manage_staff";

export interface MarketingRequest {
  id: string;
  passport_area_id: string;
  requested_by: string;
  title: string;
  details: string | null;
  status: "submitted" | "in_review" | "approved" | "declined" | "completed";
  admin_notes: string | null;
}
