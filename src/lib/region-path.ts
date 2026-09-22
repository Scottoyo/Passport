// Every other top-level static route this app has, under src/app/*/page.tsx
// plus src/app/auth/ — anything NOT in this list, with a second path
// segment, is a candidate for being a [state]/[area] region path. Shared
// between the root layout (server-side, DB-validates the slugs before
// using them for branding/admin scoping) and the client-side header nav
// (just needs the slugs themselves to build an href - the destination page
// validates on its own, so no DB round-trip is needed here).
export const NON_REGION_TOP_SEGMENTS = new Set([
  "states",
  "portal",
  "create-profile",
  "register-business",
  "forgot-password",
  "reset-password",
  "sign-in",
  "account",
  "faq",
  "passport",
  "admin",
  "auth",
]);

export function parseRegionSlugsFromPath(pathname: string): { stateSlug: string; areaSlug: string } | null {
  const [stateSlug, areaSlug] = pathname.split("/").filter(Boolean);
  if (!stateSlug || !areaSlug || NON_REGION_TOP_SEGMENTS.has(stateSlug)) return null;
  return { stateSlug, areaSlug };
}

// A bare one-segment path (e.g. "/florida") - the state's own page, one
// level up from a region. Distinct from parseRegionSlugsFromPath, which
// requires a second (area) segment.
export function parseStateSlugFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const [stateSlug] = segments;
  if (NON_REGION_TOP_SEGMENTS.has(stateSlug)) return null;
  return stateSlug;
}

// "national" is the fallback bucket for every top-level static route
// (home, FAQ, sign-in, etc.) - everything in NON_REGION_TOP_SEGMENTS
// except the three that resolve their own theming elsewhere (account
// inherits the signed-in holder's region; admin/portal never theme).
const NATIONAL_TIER_EXCLUDED = new Set(["account", "admin", "portal", "auth"]);

export type PageTier = "region" | "state" | "national" | "account" | "none";

// Admin always renders on a plain white background with black text,
// regardless of any region/state/national theming - an explicit,
// deliberate exception so the operational admin panel never
// accidentally becomes hard to read under someone else's brand colors.
export function isAdminPath(pathname: string): boolean {
  return pathname.split("/").filter(Boolean)[0] === "admin";
}

export function getPageTier(pathname: string): PageTier {
  if (parseRegionSlugsFromPath(pathname)) return "region";
  if (parseStateSlugFromPath(pathname)) return "state";
  const [topSegment] = pathname.split("/").filter(Boolean);
  if (!topSegment) return "national";
  if (topSegment === "account") return "account";
  if (NATIONAL_TIER_EXCLUDED.has(topSegment)) return "none";
  if (NON_REGION_TOP_SEGMENTS.has(topSegment)) return "national";
  return "none";
}
