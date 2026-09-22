import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, DM_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BrandColorSync } from "@/components/brand-color-sync";
import { resolveTheme } from "@/lib/resolve-theme";
import { isAdminPath } from "@/lib/region-path";
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
  const theme = await resolveTheme(pathname);

  const brandStyle: React.CSSProperties = {};
  if (theme.primary) {
    Object.assign(brandStyle, {
      "--brand-primary": theme.primary,
      "--brand-primary-dark": theme.primaryDark,
      "--brand-secondary": theme.secondary ?? theme.primary,
    });
  }
  if (theme.accent) Object.assign(brandStyle, { "--brand-accent": theme.accent });
  if (theme.text) Object.assign(brandStyle, { "--brand-text": theme.text });
  if (theme.background) {
    Object.assign(brandStyle, { "--brand-background": theme.background });
    // Any tier with its own custom background (region/state/national)
    // gets the same cool-light-gray "alternate section" treatment
    // requested for the national palette, rather than the warm cream
    // tint every unbranded page keeps as --brand-surface-alt's default -
    // a fixed refinement, not an admin-configurable field (see the
    // field-mapping decision in this feature's plan).
    Object.assign(brandStyle, { "--brand-surface-alt": "#F7F8FA" });
  }
  if (isAdminPath(pathname)) {
    // Admin always stays plain white/black, regardless of any
    // region/state/national theming - an operational panel, not a
    // public-facing branded page.
    Object.assign(brandStyle, {
      "--brand-background": "#FFFFFF",
      "--brand-text": "#000000",
      "--brand-surface-alt": "#F7F8FA",
    });
  }

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={Object.keys(brandStyle).length ? brandStyle : undefined}
        data-themed={theme.primary ? "true" : undefined}
      >
        <BrandColorSync />
        <SiteHeader />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
