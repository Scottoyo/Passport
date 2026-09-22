import Image from "next/image";

// A region with no hero_image_url set (see the branding admin form) falls
// back to each page's existing plain/brand-color hero band, so this is
// purely additive (nothing breaks for a region without a supplied image).
export function getRegionHeroImage(area: { slug: string; hero_image_url: string | null }) {
  if (!area.hero_image_url) return null;
  return { src: area.hero_image_url, alt: `${area.slug} Passport hero` };
}

// A photographic hero, used instead of the plain solid-color hero
// band/card on any region/state/national page with its own custom
// artwork. The image already carries its own headline/tagline copy, so
// callers should NOT render a second, redundant visible H1/tagline on
// top of it - just the functional CTAs (when overlay="scrim").
//
// `variant` controls width/shape - kept uniform across every tier
// (region/state/national) so every hero on the site renders at the same
// size, per explicit request:
// "full-bleed" - a top-level page section, full viewport width.
// "card" - a rounded, inset card constrained to whatever parent column
// the caller wraps it in (typically `mx-auto max-w-6xl`) - the standard
// size for every hero on the site today.
//
// `fit` controls crop behavior, independent of `variant`:
// "cover" (default) - fills the box, cropping if the image's own aspect
// ratio doesn't exactly match.
// "contain" - the full image is always visible with no cropping at any
// viewport width - for a region whose art has fine text baked in near
// the edges that must never be cut off (e.g. the national hero).
//
// overlay "scrim" (default) - a bottom gradient for legible light-on-dark
// CTAs/headings over the image, matching every region hero today.
// overlay "none" - no gradient at all; pairs with fit="contain" for a
// hero that's pure photography with nothing overlaid on top of it.
export function RegionHeroBanner({
  src,
  alt,
  variant = "full-bleed",
  fit = "cover",
  overlay = "scrim",
  children,
}: {
  src: string;
  alt: string;
  variant?: "full-bleed" | "card";
  fit?: "cover" | "contain";
  overlay?: "scrim" | "none";
  children?: React.ReactNode;
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
        className={fit === "contain" ? "object-contain" : "object-cover"}
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
