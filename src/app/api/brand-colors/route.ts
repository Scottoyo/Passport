import { NextResponse, type NextRequest } from "next/server";
import { resolveBrandArea } from "@/lib/resolve-brand-area";

// Re-resolves brand colors for an arbitrary app pathname, on demand -
// called by BrandColorSync on every client-side navigation, since the root
// layout's own server-rendered <body> style only reflects whichever page
// was hard-loaded/first rendered and does not re-run on subsequent
// client-side Link navigations (Next.js reuses the shared root layout
// across those by design). No auth/session data beyond what
// resolveBrandArea itself already reads (the caller's own cookies, via the
// standard server Supabase client) - this never takes or exposes anything
// the caller doesn't already have.
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  const area = await resolveBrandArea(path);

  if (!area?.brand_primary_color) {
    return NextResponse.json({ themed: false });
  }

  return NextResponse.json({
    themed: true,
    primary: area.brand_primary_color,
    primaryDark: area.brand_secondary_color ?? area.brand_primary_color,
    secondary: area.brand_secondary_color ?? area.brand_primary_color,
  });
}
