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
