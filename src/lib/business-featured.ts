import type { Business } from "@/lib/types/domain";

type FeaturedFields = Pick<Business, "featured" | "featured_starts_at" | "featured_ends_at">;

// The single source of truth for "is this business's featured listing
// currently due to show" - mirrors the read-side filter applied in
// getBusinessesForArea, so admin UI never disagrees with what the public
// Home page actually renders. `featured` is the master switch; the two
// window columns, when set, additionally bound it - a null bound means
// unbounded on that side (matches existing rows that predate the window
// feature, which keep behaving as "featured until turned off").
export function isBusinessCurrentlyFeatured(business: FeaturedFields, now: Date = new Date()): boolean {
  if (!business.featured) return false;
  if (business.featured_starts_at && new Date(business.featured_starts_at) > now) return false;
  if (business.featured_ends_at && new Date(business.featured_ends_at) < now) return false;
  return true;
}

export function featuredStatusLabel(business: FeaturedFields, now: Date = new Date()): string {
  if (!isBusinessCurrentlyFeatured(business, now)) {
    if (business.featured && business.featured_ends_at && new Date(business.featured_ends_at) < now) {
      return "Featured window ended";
    }
    return "Not featured";
  }
  if (business.featured_ends_at) {
    const endDate = new Date(business.featured_ends_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `Featured until ${endDate}`;
  }
  return "Featured";
}
