import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getStateBySlug, getAreaBySlug, getMyPrimaryRegion } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea } from "@/lib/types/domain";
import "./globals.css";

// Every other top-level static route this app has, under src/app/*/page.tsx
// plus src/app/auth/ — anything NOT in this list, with a second path
// segment, is a candidate for the [state]/[area] region layout, resolved
// for real below via a DB lookup rather than trusted blindly.
const NON_REGION_TOP_SEGMENTS = new Set([
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

async function resolveRegionFromPath(pathname: string) {
  const [stateSlug, areaSlug] = pathname.split("/").filter(Boolean);
  if (!stateSlug || !areaSlug || NON_REGION_TOP_SEGMENTS.has(stateSlug)) return null;

  const state = await getStateBySlug(stateSlug);
  if (!state) return null;
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return null;

  return { state, area };
}

// The region behind the --brand-* CSS variables set on <body> below - the
// same path-based region used for header nav, plus one more fallback: a
// signed-in passport holder viewing /account/** (no region in the URL) gets
// their own home region's branding too. Never falls back on the national
// homepage, /admin, or /portal - branding only follows an actual region or
// an actual passport holder's own account pages.
async function resolveBrandArea(
  pathname: string,
  region: { state: unknown; area: PassportArea } | null
): Promise<PassportArea | null> {
  if (region) return region.area;

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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "National Passport",
    template: "%s | National Passport",
  },
  description:
    "One Passport. Nationwide savings at participating restaurants, attractions, shops, and experiences.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const pathname = (await headers()).get("x-current-path") ?? "";
  const region = await resolveRegionFromPath(pathname);
  const brandArea = await resolveBrandArea(pathname, region);

  const brandStyle = brandArea?.brand_primary_color
    ? ({
        "--brand-primary": brandArea.brand_primary_color,
        "--brand-primary-dark": brandArea.brand_secondary_color ?? brandArea.brand_primary_color,
        "--brand-secondary": brandArea.brand_secondary_color ?? brandArea.brand_primary_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900" style={brandStyle}>
        <SiteHeader region={region} themed={Boolean(brandArea?.brand_primary_color)} />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
