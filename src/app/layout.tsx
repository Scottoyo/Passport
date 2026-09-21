import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, DM_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BrandColorSync } from "@/components/brand-color-sync";
import { resolveBrandArea } from "@/lib/resolve-brand-area";
import "./globals.css";

// The app's only two fonts, site-wide - Fraunces for major hero/marketing
// headlines, DM Sans for everything else (nav, buttons, forms, body copy,
// admin, checkout, account). Loaded once here rather than per-page so any
// component anywhere can use them via the --font-display/--font-sans
// tokens (see globals.css's @theme inline block).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
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
  const brandArea = await resolveBrandArea(pathname);

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
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-white text-slate-900"
        style={brandStyle}
        data-themed={brandArea?.brand_primary_color ? "true" : undefined}
      >
        <BrandColorSync />
        <SiteHeader />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
