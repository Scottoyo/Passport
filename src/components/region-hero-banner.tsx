import Image from "next/image";

// Custom hero photography, per region - a region with no art here falls
// back to each page's existing plain/brand-color hero band, so this is
// purely additive (nothing breaks for a region without a supplied image).
// A region's own admin-uploaded hero_image_url (see the branding admin
// form) always wins over this hardcoded fallback map when set.
const HERO_IMAGES: Record<string, { src: string; alt: string }> = {
  orlando: {
    src: "/region-hero/orlando-hero.webp",
    alt: "Orlando Passport. More to explore. A warm Orlando evening scene - outdoor dining, palm trees, a lit Ferris wheel, and the navy Orlando Passport booklet.",
  },
};

export function getRegionHeroImage(area: { slug: string; hero_image_url: string | null }) {
  if (area.hero_image_url) {
    return { src: area.hero_image_url, alt: `${area.slug} Passport hero` };
  }
  return HERO_IMAGES[area.slug] ?? null;
}

// A photographic hero, used instead of the plain solid-color hero
// band/card on any region/state/national page with its own custom
// artwork. The image already carries its own headline/tagline copy, so
// callers should NOT render a second, redundant visible H1/tagline on
// top of it - just the functional CTAs (when overlay="scrim").
//
// variant "full-bleed" - a top-level page section, full viewport width
// (the region Home page hero).
// variant "card" - a rounded, inset card that fits inside a narrower
// column (Discover's hero, which also renders inside the account
// sidebar's content area, not just the standalone page - it has always
// been an inset card in both contexts, never full-bleed).
// variant "contain" - a fixed-aspect-ratio box using object-contain
// instead of object-cover, so the full image is always visible with no
// cropping at any viewport width (the national hero's own requirement -
// it has fine text baked into the artwork that must never be cut off).
//
// overlay "scrim" (default) - a bottom gradient for legible light-on-dark
// CTAs/headings over the image, matching every region hero today.
// overlay "none" - no gradient at all; pairs with variant="contain" for a
// hero that's pure photography with nothing overlaid on top of it.
export function RegionHeroBanner({
  src,
  alt,
  variant = "full-bleed",
  overlay = "scrim",
  children,
}: {
  src: string;
  alt: string;
  variant?: "full-bleed" | "card" | "contain";
  overlay?: "scrim" | "none";
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative aspect-[2.4/1] w-full ${variant === "contain" ? "" : "sm:aspect-[2.6/1]"} ${
        variant === "card" ? "overflow-hidden rounded-2xl" : ""
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes={variant === "card" ? "(min-width: 1024px) 60vw, 100vw" : "100vw"}
        className={variant === "contain" ? "object-contain" : "object-cover"}
      />
      {overlay === "scrim" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/85 via-brand-primary-dark/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-6 sm:pb-8">
            <div className={variant === "full-bleed" ? "mx-auto max-w-6xl" : ""}>{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
