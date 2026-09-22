import { NextResponse, type NextRequest } from "next/server";
import { resolveTheme } from "@/lib/resolve-theme";
import { isAdminPath } from "@/lib/region-path";

// Re-resolves the theme for an arbitrary app pathname, on demand - called
// by BrandColorSync on every client-side navigation, since the root
// layout's own server-rendered <body> style only reflects whichever page
// was hard-loaded/first rendered and does not re-run on subsequent
// client-side Link navigations (Next.js reuses the shared root layout
// across those by design). No auth/session data beyond what resolveTheme
// itself already reads (the caller's own cookies, via the standard server
// Supabase client) - this never takes or exposes anything the caller
// doesn't already have.
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  const theme = await resolveTheme(path);

  // Admin always stays plain white/black, regardless of any theming -
  // same exception the root layout applies server-side.
  if (isAdminPath(path)) {
    return NextResponse.json({
      themed: false,
      background: "#FFFFFF",
      text: "#000000",
      surfaceAlt: "#F7F8FA",
    });
  }

  if (!theme.primary) {
    return NextResponse.json({ themed: false });
  }

  return NextResponse.json({
    themed: true,
    primary: theme.primary,
    primaryDark: theme.primaryDark,
    secondary: theme.secondary ?? theme.primary,
    accent: theme.accent,
    text: theme.text,
    background: theme.background,
    surfaceAlt: theme.background ? "#F7F8FA" : null,
  });
}
