import { getActiveStates, getStateIdsWithLivePerks } from "@/lib/queries";
import { StateMap } from "@/components/state-map";

export default async function HomePage() {
  const [states, perkStateIds] = await Promise.all([getActiveStates(), getStateIdsWithLivePerks()]);

  return (
    <div>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            A Passport for every region you explore.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Each region has its own Passport - one purchase unlocks
            exclusive offers at participating restaurants, attractions,
            shops, and experiences across that region.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#states"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Find your region
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900">Why get a Passport</h2>
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

      <section className="border-t border-slate-200 bg-slate-50">
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
        <StateMap states={states} perkStateIds={perkStateIds} />
      </section>
    </div>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
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
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
