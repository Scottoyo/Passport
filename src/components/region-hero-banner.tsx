import Image from "next/image";

// Custom hero photography, per region - a region with no art here falls
// back to each page's existing plain/brand-color hero band, so this is
// purely additive (nothing breaks for a region without a supplied image).
const HERO_IMAGES: Record<string, { src: string; alt: string }> = {
  orlando: {
    src: "/region-hero/orlando-hero.webp",
    alt: "Orlando Passport. More to explore. A warm Orlando evening scene - outdoor dining, palm trees, a lit Ferris wheel, and the navy Orlando Passport booklet.",
  },
};

export function getRegionHeroImage(areaSlug: string) {
  return HERO_IMAGES[areaSlug] ?? null;
}

// A photographic hero with a bottom scrim for legible light-on-dark
// content (buttons, a visually-hidden heading for accessibility/SEO) -
// used instead of the plain solid-color hero band/card on any region with
// its own custom artwork. The image already carries its own
// headline/tagline copy, so callers should NOT render a second, redundant
// visible H1/tagline on top of it - just the functional CTAs.
//
// variant "full-bleed" - a top-level page section, full viewport width
// (the region Home page hero).
// variant "card" - a rounded, inset card that fits inside a narrower
// column (Discover's hero, which also renders inside the account
// sidebar's content area, not just the standalone page - it has always
// been an inset card in both contexts, never full-bleed).
export function RegionHeroBanner({
  src,
  alt,
  variant = "full-bleed",
  children,
}: {
  src: string;
  alt: string;
  variant?: "full-bleed" | "card";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative aspect-[2.4/1] w-full sm:aspect-[2.6/1] ${
        variant === "card" ? "overflow-hidden rounded-2xl" : ""
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes={variant === "card" ? "(min-width: 1024px) 60vw, 100vw" : "100vw"}
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/85 via-brand-primary-dark/15 to-transparent" />
      <div className={`absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-6 sm:pb-8`}>
        <div className={variant === "full-bleed" ? "mx-auto max-w-6xl" : ""}>{children}</div>
      </div>
    </div>
  );
}
