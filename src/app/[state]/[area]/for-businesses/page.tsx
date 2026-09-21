import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";

// Scoped to this page only (not the root layout) - the rest of the app
// keeps its existing Geist/Arial type. This page's "editorial travel
// poster" direction is a deliberate one-off treatment for the business
// acquisition landing page, not a site-wide font change.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

// Custom hero photography, per region. A region with no art here falls back
// to the plain bold-brand-color hero band (see the `heroImage` check below) -
// same "safe default, richer when set" pattern as the rest of the branding
// system, just for a hand-curated asset instead of an admin color field.
const HERO_IMAGES: Record<string, { src: string; width: number; height: number; alt: string }> = {
  orlando: {
    src: "/for-businesses/orlando-hero.png",
    width: 1536,
    height: 1024,
    alt: "Downtown Orlando skyline at sunset over Lake Eola's fountain, with a travel journal, sunglasses, and fresh oranges in the foreground.",
  },
};

interface Props {
  params: Promise<{ state: string; area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return {};

  const title = `Join ${area.name} Passport | Reach Locals & Visitors`;
  const description = `List your ${area.name}-area business, create an exclusive Passport perk, and reach locals and visitors ready to eat, shop, explore, and experience more. Free to join.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function ForBusinessesPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const registerHref = `/register-business?state=${state.slug}&region=${area.slug}`;
  const heroImage = HERO_IMAGES[area.slug];

  return (
    <div className={`${fraunces.variable} ${dmSans.variable} scroll-smooth`}>
      {/* Hero */}
      <section className={heroImage ? "bg-[#FFF7E8]" : "bg-brand-primary"}>
        <div
          className={`mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 ${
            heroImage ? "grid items-center gap-10 lg:grid-cols-[42%_58%]" : "max-w-4xl text-center"
          }`}
        >
          <div>
            <p
              className={`text-sm font-semibold uppercase tracking-wide ${
                heroImage ? "text-brand-primary" : "text-white/80"
              }`}
            >
              For {area.name} Businesses
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
                heroImage ? "bg-[#F2DFC0] text-[#102F3B]" : "bg-white/15 text-white"
              }`}
            >
              <CheckIcon className="h-4 w-4 shrink-0" />
              100% Free to Join &mdash; No Monthly Fees
            </span>
            <h1
              className={`mt-4 font-[family-name:var(--font-fraunces)] text-4xl font-bold tracking-tight sm:text-5xl ${
                heroImage ? "text-[#102F3B]" : "text-white"
              }`}
            >
              Turn Passport Holders Into New Regulars.
            </h1>
            <p
              className={`mt-4 max-w-xl font-[family-name:var(--font-dm-sans)] text-lg ${
                heroImage ? "text-[#102F3B]/80" : "text-white/90"
              } ${heroImage ? "" : "mx-auto"}`}
            >
              {area.name} Passport puts your business in front of locals and visitors who are
              actively deciding where to eat, shop, explore, and spend. Create an exclusive perk,
              welcome new customers, and give them a reason to come back.
            </p>
            <div className={`mt-8 flex flex-wrap items-center gap-4 ${heroImage ? "" : "justify-center"}`}>
              <Link
                href={registerHref}
                className={
                  heroImage
                    ? "rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark"
                    : "rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-slate-100"
                }
              >
                List Your Business
              </Link>
              <a
                href="#how-it-works"
                className={
                  heroImage
                    ? "text-sm font-semibold text-[#102F3B] hover:text-brand-primary"
                    : "text-sm font-semibold text-white hover:text-white/80"
                }
              >
                See How It Works &darr;
              </a>
            </div>
            <p className={`mt-3 text-sm ${heroImage ? "text-[#102F3B]/60" : "text-white/70"}`}>
              Simple registration. You choose the perk. Every listing is reviewed.
            </p>
          </div>
          {heroImage && (
            <div className="relative aspect-[3/2] overflow-hidden rounded-[24px]">
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                fill
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover object-[center_right] max-lg:object-[68%_center]"
              />
            </div>
          )}
        </div>
      </section>

      {/* Value section */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand-primary">
            More Than a Discount
          </p>
          <h2 className="mt-2 text-center font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#102F3B]">
            A better way to be discovered.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#102F3B]/70">
            {area.name} Passport is a local discovery platform designed to turn curiosity into
            visits&mdash;and first visits into lasting customers.
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            <StampStat title="Get found at the right moment">
              Reach people while they are actively looking for their next meal, activity, shop, or
              local experience.
            </StampStat>
            <StampStat title="Create a reason to visit">
              Offer a perk that feels worthwhile to the customer and still makes sense for your
              business.
            </StampStat>
            <StampStat title="Win the return visit">
              The perk opens the door. Your product, service, and hospitality create the
              relationship.
            </StampStat>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-[#F2DFC0] bg-[#FFF7E8] scroll-mt-20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand-primary">
            From Listing to Foot Traffic
          </p>
          <h2 className="mt-2 text-center font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#102F3B]">
            Joining is straightforward.
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <RouteStep step="01" title="Tell us about your business">
              Add your location, category, photos, and the details that make you worth
              discovering.
            </RouteStep>
            <RouteStep step="02" title="Choose your Passport perk">
              Build an offer around your goals, margins, and customer experience.
            </RouteStep>
            <RouteStep step="03" title="Get published">
              Once approved, your business becomes discoverable to {area.name} Passport holders.
            </RouteStep>
            <RouteStep step="04" title="Welcome new customers">
              Customers visit, redeem, explore what else you offer, and have a reason to return.
            </RouteStep>
          </div>
        </div>
      </section>

      {/* Perk examples */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand-primary">
            You Control the Offer
          </p>
          <h2 className="mt-2 text-center font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#102F3B]">
            Make the first visit irresistible.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#102F3B]/70">
            A great perk does not have to be complicated. It should be easy to understand, easy
            for your team to honor, and strong enough to inspire a visit.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Complimentary appetizer with an entrée",
              "Free upgrade or add-on",
              "10% off a qualifying purchase",
              "Buy one experience, receive the second at a special rate",
              "Exclusive Passport-holder package",
              "Complimentary item with a minimum purchase",
            ].map((perk, i) => (
              <PerkTicket key={perk} rotate={i % 3 === 1 ? "rotate-1" : i % 3 === 2 ? "-rotate-1" : ""}>
                {perk}
              </PerkTicket>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[#102F3B]/60">
            These are examples only. You choose the perk that fits your business.
          </p>
        </div>
      </section>

      {/* Fit / category ribbon */}
      <section className="border-t border-[#F2DFC0] bg-[#FFF7E8]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#102F3B] sm:text-3xl">
            If you help people enjoy {area.name}, you belong here.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              "Restaurants & Cafés",
              "Attractions",
              "Tours & Experiences",
              "Shopping",
              "Health & Wellness",
              "Entertainment",
              "Hospitality",
              "Local Services",
            ].map((category) => (
              <span
                key={category}
                className="rounded-full border border-[#F2DFC0] bg-white px-4 py-2 text-sm font-medium text-[#102F3B]"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#102F3B]">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            <FaqItem question={`Who can join ${area.name} Passport?`}>
              Independent businesses, regional operators, and distinctive {area.name}-area
              experiences may apply. Every listing is reviewed to keep the Passport useful and
              engaging for holders.
            </FaqItem>
            <FaqItem question="Do I choose my own perk?">
              Yes. You propose the offer, terms, and any reasonable restrictions. The{" "}
              {area.name} Passport team can help make it clear and compelling.
            </FaqItem>
            <FaqItem question="Does the perk need to be a percentage discount?">
              No. Upgrades, add-ons, complimentary items, packages, and exclusive experiences can
              often create more value than a standard discount.
            </FaqItem>
            <FaqItem question="What happens after I register?">
              Your information and proposed perk are reviewed. Once approved, your listing can be
              published in the Passport and made available for discovery.
            </FaqItem>
            <FaqItem question="Can I update my business information later?">
              Yes. Use the existing business account tools to manage your profile and available
              promotion details.
            </FaqItem>
            <FaqItem question="Is there a cost to join?">
              No. Listing your business and offering a perk on {area.name} Passport is free, with
              no monthly fees.
            </FaqItem>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[#102F3B]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#F47A38]">
            Your Next Customer Is Exploring
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-bold text-white sm:text-4xl">
            Give them a reason to choose you.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Join {area.name} Passport and become part of the places, flavors, and experiences
            people remember most.
          </p>
          <div className="mt-8">
            <Link
              href={registerHref}
              className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#102F3B] hover:bg-slate-100"
            >
              Register Your Business
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Free to join, no monthly fees. Submit your business and proposed perk for review.
          </p>
        </div>
      </section>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StampStat({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-brand-primary text-brand-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7" aria-hidden>
          <path d="M12 3v18M3 12h18" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#102F3B]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[#102F3B]/70">{children}</p>
    </div>
  );
}

function RouteStep({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary font-[family-name:var(--font-fraunces)] text-sm font-bold text-white">
        {step}
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#102F3B]">{title}</h3>
      <p className="mt-1 text-sm text-[#102F3B]/70">{children}</p>
    </div>
  );
}

function PerkTicket({ children, rotate = "" }: { children: React.ReactNode; rotate?: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-[#E95D4E]/50 bg-white px-5 py-4 text-sm font-medium text-[#102F3B] shadow-sm ${rotate}`}
    >
      {children}
    </div>
  );
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-[#F2DFC0] bg-[#FFF7E8] px-5 py-4 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#102F3B]">
        {question}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 shrink-0 text-brand-primary transition-transform group-open:rotate-180"
          aria-hidden
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="mt-3 text-sm text-[#102F3B]/70">{children}</p>
    </details>
  );
}
