import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";

interface Props {
  params: Promise<{ state: string; area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `Register Your Business | ${area.name} Passport` : "Register Your Business" };
}

export default async function ForBusinessesPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const registerHref = `/register-business?state=${state.slug}&region=${area.slug}`;

  return (
    <div>
      <section className="bg-brand-primary">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            For {area.name} Businesses
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Reach More Locals. Welcome More Visitors. Grow Your Business.
          </h1>
          <p className="mt-4 text-xl font-semibold text-white">Join the {area.name} Passport</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            The {area.name} Passport connects local businesses with residents and visitors who are
            actively looking for new places to eat, shop, explore, and experience.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-white/90">
            Register your business, create an exclusive perk, and give Passport holders another
            reason to choose you.
          </p>
          <div className="mt-8">
            <Link
              href={registerHref}
              className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-slate-100"
            >
              Register Your Business
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Turn Discovery Into New Customers</h2>
        <p className="mt-3 text-slate-600">
          People use the {area.name} Passport to discover memorable experiences throughout{" "}
          {area.name} and the surrounding areas. By joining, your business can:
        </p>
        <BulletGrid
          items={[
            "Reach customers actively searching for things to do",
            "Increase awareness among locals and visitors",
            "Attract first-time customers with an exclusive perk",
            "Encourage customers to spend more once they arrive",
            "Build repeat business and local loyalty",
            "Gain additional exposure through Passport promotions",
          ]}
        />
        <p className="mt-6 text-slate-600">
          Whether you operate a restaurant, attraction, shop, tour, entertainment venue, wellness
          business, or unique local experience, the {area.name} Passport helps more people discover
          what makes your business special.
        </p>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">You Choose the Perk</h2>
          <p className="mt-3 text-slate-600">
            You stay in control of the offer. Create a perk that makes sense for your business,
            such as:
          </p>
          <BulletGrid
            items={[
              "A complimentary appetizer with purchase",
              "10% off a purchase or experience",
              "A free upgrade or add-on",
              "Buy one, get one offers",
              "A special Passport-holder package",
              "A complimentary item with a minimum purchase",
              "Exclusive access or a unique experience",
            ]}
          />
          <p className="mt-6 text-slate-600">
            Your perk should be valuable enough to inspire a visit while encouraging customers to
            engage with and spend at your business.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">More Than a Discount</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          The {area.name} Passport is designed to introduce customers to businesses they may not
          have discovered otherwise.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          A strong perk gets them through the door. Your experience gives them a reason to return,
          recommend your business, and become a long-term customer.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          It is a simple way to support local discovery while creating measurable opportunities for
          your business.
        </p>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">How It Works</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <HowItWorksStep
              step="1"
              title="Register Your Business"
              body="Tell us about your business, location, and what makes it unique."
            />
            <HowItWorksStep
              step="2"
              title="Create Your Perk"
              body="Choose an exclusive offer that Passport holders can redeem."
            />
            <HowItWorksStep
              step="3"
              title="Get Discovered"
              body={`Your business appears in the ${area.name} Passport for customers exploring participating restaurants, attractions, shops, and experiences.`}
            />
            <HowItWorksStep
              step="4"
              title="Welcome New Customers"
              body="Passport holders visit your business, redeem their perk, and experience everything else you have to offer."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Built for {area.name} Businesses</h2>
        <p className="mt-3 text-slate-600">The {area.name} Passport is a great fit for:</p>
        <BulletGrid
          items={[
            "Restaurants, cafés, bars, and dessert shops",
            "Attractions and family activities",
            "Tours and outdoor experiences",
            "Retail stores and boutiques",
            "Health, beauty, and wellness businesses",
            "Entertainment and nightlife venues",
            "Hotels and hospitality businesses",
            "Local services and one-of-a-kind experiences",
          ]}
        />
        <p className="mt-6 text-slate-600">
          If your business gives people another reason to enjoy {area.name}, we want you in the
          Passport.
        </p>
      </section>

      <section className="bg-brand-primary">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Be Part of the {area.name} Experience</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/90">
            {area.name} is more than a destination. It is a collection of local businesses,
            unforgettable experiences, and hidden gems waiting to be discovered.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-white/90">
            Join the {area.name} Passport and put your business in front of customers who are ready
            to explore.
          </p>
          <div className="mt-8">
            <Link
              href={registerHref}
              className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-slate-100"
            >
              Register Your Business
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">
            Registration is quick and simple. Submit your business information and proposed perk
            for review.
          </p>
        </div>
      </section>
    </div>
  );
}

function BulletGrid({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-slate-700">
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary"
      aria-hidden
    >
      <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HowItWorksStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
