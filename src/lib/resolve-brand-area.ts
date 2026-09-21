import "server-only";

import { getStateBySlug, getAreaBySlug, getMyPrimaryRegion } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { parseRegionSlugsFromPath } from "@/lib/region-path";
import type { PassportArea } from "@/lib/types/domain";

// The single source of truth for "what region's brand colors should apply
// on this path" - a real region in the URL, or (for /account/** only) a
// signed-in passport holder's own home region. Used by both the root
// layout (for the initial server-rendered <body> style, so there's no
// flash of default colors on first paint/hard load) and the
// /api/brand-colors route (for BrandColorSync to re-resolve this on every
// client-side navigation - see that component for why the initial
// server-rendered value alone isn't enough).
export async function resolveBrandArea(pathname: string): Promise<PassportArea | null> {
  const slugs = parseRegionSlugsFromPath(pathname);
  if (slugs) {
    const state = await getStateBySlug(slugs.stateSlug);
    if (!state) return null;
    return getAreaBySlug(state.id, slugs.areaSlug);
  }

  const [topSegment] = pathname.split("/").filter(Boolean);
  if (topSegment !== "account") return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const myRegion = await getMyPrimaryRegion(user.id);
  if (!myRegion) return null;
  const state = await getStateBySlug(myRegion.stateSlug);
  if (!state) return null;
  return getAreaBySlug(state.id, myRegion.areaSlug);
}
