import Link from "next/link";
import { getActiveStates } from "@/lib/queries";
import { StateMap } from "@/components/state-map";
import { RegionHeroBanner } from "@/components/region-hero-banner";

export default async function HomePage() {
  const states = await getActiveStates();

  return (
    <div>
      {/* The hero image already carries its own headline/logo/tagline (see
          the national branding admin page) - no visible H1/CTA on top of
          it, per the national hero's own no-overlay/no-crop requirements.
          A visually-hidden H1 covers accessibility/SEO instead. Sized to
          match every other region/state hero on the site (variant="card"). */}
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <RegionHeroBanner
          variant="card"
          fit="contain"
          overlay="none"
          src="/images/branding/national/local-perks-national-hero.webp"
          alt="Local Perks Passport. More to explore. Discover attractions, experiences, and restaurants across America."
        />
      </div>
      <h1 className="sr-only">Local Perks Passport - a Passport for every region you explore</h1>

      <div className="border-b border-border bg-brand-surface-alt">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <p className="text-brand-text">
            Each region has its own Passport - one purchase unlocks exclusive
            offers at participating restaurants, attractions, shops, and
            experiences across that region.
          </p>
          <div className="mt-4">
            <a
              href="#states"
              className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
            >
              Find your region
            </a>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-ink">Why get a Passport</h2>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-brand-accent" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Benefit
            title="Deep local savings"
            body="Your region's Passport unlocks every participating business across that whole region."
          />
          <Benefit
            title="Real savings, not gimmicks"
            body="Every offer is a real discount, freebie, or deal from a business that opted in - no fine print designed to make it unusable."
          />
          <Benefit
            title="Bring the family"
            body="Many Passports cover more than one person, so everyone in your group saves - not just the Passport holder."
          />
          <Benefit
            title="Collect every state"
            body="Traveling to a new state? Its Passport is a separate purchase - and its own set of savings waiting for you."
          />
        </div>
      </section>

      <section className="border-t border-border bg-brand-surface-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-3">
            <HowItWorksStep
              step="1"
              title="Get Your Passport"
              body="One purchase covers every business in that region."
            />
            <HowItWorksStep
              step="2"
              title="Find participating spots"
              body="Browse by Passport Area to discover local businesses and offers near you."
            />
            <HowItWorksStep
              step="3"
              title="Show it and save"
              body="Present your digital Passport at checkout to redeem each business's offer."
            />
          </div>
        </div>
      </section>

      <section id="states" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <StateMap states={states} />
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
          <h2 className="text-lg font-semibold text-ink">Own a business?</h2>
          <p className="max-w-xl text-sm text-ink-muted">
            It&apos;s free to join The Passport - no monthly fees - and put your business in
            front of locals and visitors actively looking for new places to go.
          </p>
          <Link
            href="/register-business"
            className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
          >
            Register Your Business &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function HowItWorksStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
