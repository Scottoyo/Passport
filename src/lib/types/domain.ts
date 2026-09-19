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
  state_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export type BusinessApprovalStatus = "pending_review" | "approved" | "rejected";

export interface BusinessHoursDay {
  day: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
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
  short_description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  gallery_image_urls: string[];
  business_hours: BusinessHoursDay[] | null;
  weather_permitting: boolean;
  call_for_appointment: boolean;
  redemption_code: string | null;
  redemption_code_updated_at: string | null;
  redemption_failed_attempts: number;
  redemption_locked_at: string | null;
  referral_code: string | null;
  referral_payout_rate_cents: number;
  referral_suspended_at: string | null;
  featured: boolean;
  approval_status: BusinessApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  redemptions_per_passport: number | null;
  redemption_instructions: string | null;
  status: ContentStatus;
  featured: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface PassportProduct {
  id: string;
  state_id: string;
  passport_area_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_days: number;
  status: ContentStatus;
}

export type PassportStatus = "active" | "expired" | "revoked";

export interface Passport {
  id: string;
  passport_number: string;
  owner_user_id: string;
  passport_product_id: string;
  state_id: string;
  passport_area_id: string;
  status: PassportStatus;
  purchased_at: string;
  expires_at: string;
  payment_reference: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  referred_by_business_id: string | null;
  referred_by_profile_id: string | null;
  photo_url: string | null;
  amount_paid_cents: number;
  promo_code_id: string | null;
  discount_cents: number;
  referral_payout_cents: number;
  referral_payout_paid_at: string | null;
}

export type PromoDiscountType = "percent_off" | "amount_off";
export type PromoCodeStatus = "active" | "inactive";

export interface PromoCode {
  id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  scope_state_id: string | null;
  scope_area_id: string | null;
  status: PromoCodeStatus;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  passport_id: string;
  offer_id: string;
  redeemed_member_id: string | null;
  redeemed_by_staff_id: string | null;
  redeemed_at: string;
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

export interface StateAssignment {
  id: string;
  user_id: string;
  state_id: string;
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
  business_id: string | null;
  requested_by: string;
  title: string;
  details: string | null;
  status: "submitted" | "in_review" | "approved" | "live" | "declined" | "completed";
  service_type: string | null;
  start_date: string | null;
  end_date: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  achievement_unlocked: boolean;
  admin_announcement: boolean;
  new_achievement_available: boolean;
  new_business_added: boolean;
  new_promotion_added: boolean;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  age_range: string | null;
  address_line1: string | null;
  city: string | null;
  state_code: string | null;
  postal_code: string | null;
  notification_preferences: NotificationPreferences;
  notifications_last_read_at: string | null;
  referral_code: string | null;
  referral_payout_rate_cents: number;
  referral_suspended_at: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export type RegionEventType = "new_business" | "new_offer";

export interface RegionEvent {
  id: string;
  passport_area_id: string;
  event_type: RegionEventType;
  business_id: string | null;
  offer_id: string | null;
  created_at: string;
}

export interface BusinessFavorite {
  id: string;
  user_id: string;
  business_id: string;
  created_at: string;
}

export type AdminNotificationType = "business_pending_review" | "marketing_request_submitted";

export interface AdminNotification {
  id: string;
  passport_area_id: string;
  notification_type: AdminNotificationType;
  business_id: string | null;
  marketing_request_id: string | null;
  created_at: string;
}
