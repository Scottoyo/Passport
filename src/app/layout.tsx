import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";
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

async function resolveRegionFromPath() {
  const pathname = (await headers()).get("x-current-path") ?? "";
  const [stateSlug, areaSlug] = pathname.split("/").filter(Boolean);
  if (!stateSlug || !areaSlug || NON_REGION_TOP_SEGMENTS.has(stateSlug)) return null;

  const state = await getStateBySlug(stateSlug);
  if (!state) return null;
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return null;

  return { state, area };
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
  const region = await resolveRegionFromPath();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <SiteHeader region={region} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
