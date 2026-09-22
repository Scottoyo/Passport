import "server-only";

import { getStateBySlug, getAreaBySlug, getMyPrimaryRegion } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { parseRegionSlugsFromPath, parseStateSlugFromPath, getPageTier } from "@/lib/region-path";
import type { NationalBranding, State } from "@/lib/types/domain";

export const NATIONAL_BRANDING_ID = "00000000-0000-0000-0000-000000000001";

export interface ResolvedTheme {
  level: "region" | "state" | "national" | "default";
  primary: string | null;
  primaryDark: string | null;
  secondary: string | null;
  accent: string | null;
  text: string | null;
  background: string | null;
  heroOverlay: "scrim" | "none" | null;
  heroImageUrl: string | null;
}

function emptyTheme(): ResolvedTheme {
  return {
    level: "default",
    primary: null,
    primaryDark: null,
    secondary: null,
    accent: null,
    text: null,
    background: null,
    heroOverlay: null,
    heroImageUrl: null,
  };
}

function pick(...values: (string | null | undefined)[]): string | null {
  for (const v of values) if (v) return v;
  return null;
}

async function getNationalBranding(): Promise<NationalBranding | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("national_branding")
    .select("*")
    .eq("id", NATIONAL_BRANDING_ID)
    .maybeSingle<NationalBranding>();
  return data;
}

function stateTheme(state: State): ResolvedTheme {
  if (!state.brand_primary_color) return emptyTheme();
  return {
    level: "state",
    primary: state.brand_primary_color,
    primaryDark: pick(state.brand_secondary_color, state.brand_primary_color),
    secondary: state.brand_secondary_color,
    accent: state.brand_accent_color,
    text: state.brand_text_color,
    background: state.brand_background_color,
    heroOverlay: (state.brand_hero_overlay as ResolvedTheme["heroOverlay"]) ?? null,
    heroImageUrl: state.hero_image_url,
  };
}

// Region inherits from its state for any field the region itself left
// null (state does NOT itself fall back to national - see resolveTheme's
// own comment on why national is a separate, non-cascading tier).
async function resolveRegionTheme(stateSlug: string, areaSlug: string): Promise<ResolvedTheme> {
  const state = await getStateBySlug(stateSlug);
  if (!state) return emptyTheme();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return emptyTheme();

  const primary = pick(area.brand_primary_color, state.brand_primary_color);
  if (!primary) return emptyTheme();

  return {
    level: area.brand_primary_color ? "region" : "state",
    primary,
    primaryDark: pick(area.brand_secondary_color, state.brand_secondary_color, primary),
    secondary: pick(area.brand_secondary_color, state.brand_secondary_color),
    accent: pick(area.brand_accent_color, state.brand_accent_color),
    text: pick(area.brand_text_color, state.brand_text_color),
    background: pick(area.brand_background_color, state.brand_background_color),
    // Hero image/overlay are the region's own only - never inherited from
    // the state, matching the national tier's hero being exclusive to
    // national pages (a hero is a specific piece of art chosen for one
    // exact page, not something that should silently appear one level
    // down from where an admin uploaded it).
    heroOverlay: (area.brand_hero_overlay as ResolvedTheme["heroOverlay"]) ?? null,
    heroImageUrl: area.hero_image_url,
  };
}

// The single source of truth for "what theme applies on this path" -
// national tier for top-level static routes (home, FAQ, sign-in, etc.),
// a state's own theme on its bare page, a region's theme (inheriting
// from its own state only) on a region page, or the signed-in passport
// holder's own home region for /account/**. National branding is
// deliberately NOT a fallback for an unbranded state/region - it only
// ever applies when actually rendering a national-tier page (confirmed
// product decision: this must not silently repaint every unbranded
// region white). Used by both the root layout (initial server-rendered
// <body> style) and the /api/brand-colors route (BrandColorSync re-runs
// this on every client-side navigation, since Next doesn't re-render a
// shared layout on plain Link clicks).
export async function resolveTheme(pathname: string): Promise<ResolvedTheme> {
  const tier = getPageTier(pathname);

  if (tier === "national") {
    const national = await getNationalBranding();
    if (!national?.brand_primary_color) return emptyTheme();
    return {
      level: "national",
      primary: national.brand_primary_color,
      primaryDark: pick(national.brand_secondary_color, national.brand_primary_color),
      secondary: national.brand_secondary_color,
      accent: national.brand_accent_color,
      text: national.brand_text_color,
      background: national.brand_background_color,
      heroOverlay: (national.brand_hero_overlay as ResolvedTheme["heroOverlay"]) ?? null,
      heroImageUrl: national.hero_image_url,
    };
  }

  if (tier === "region") {
    const slugs = parseRegionSlugsFromPath(pathname)!;
    return resolveRegionTheme(slugs.stateSlug, slugs.areaSlug);
  }

  if (tier === "state") {
    const stateSlug = parseStateSlugFromPath(pathname)!;
    const state = await getStateBySlug(stateSlug);
    return state ? stateTheme(state) : emptyTheme();
  }

  if (tier === "account") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return emptyTheme();
    const myRegion = await getMyPrimaryRegion(user.id);
    if (!myRegion) return emptyTheme();
    return resolveRegionTheme(myRegion.stateSlug, myRegion.areaSlug);
  }

  return emptyTheme();
}
