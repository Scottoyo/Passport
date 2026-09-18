import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea, State } from "@/lib/types/domain";
import { createState, setStateStatus, createArea, setAreaStatus } from "./actions";
import { StatusBadge } from "@/components/status-badge";

export default async function LocationsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const supabase = await createClient();
  const [{ data: states }, { data: areas }] = await Promise.all([
    supabase.from("states").select("*").order("name").returns<State[]>(),
    supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
  ]);

  const areasByState = new Map<string, PassportArea[]>();
  for (const area of areas ?? []) {
    const list = areasByState.get(area.state_id) ?? [];
    list.push(area);
    areasByState.set(area.state_id, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">States &amp; Passport Areas</h1>
      <p className="mt-1 text-slate-600">
        Create and launch new states and Passport Areas. Draft locations
        aren&apos;t visible to customers until launched.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Add a state</h2>
        <form action={createState} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              name="name"
              required
              placeholder="Georgia"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Abbreviation</span>
            <input
              name="abbreviation"
              required
              maxLength={2}
              placeholder="GA"
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
            />
          </label>
          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Add state
          </button>
        </form>
      </section>

      <div className="mt-10 space-y-8">
        {(states ?? []).map((state) => (
          <div key={state.id} className="rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {state.name} ({state.abbreviation})
                </h2>
                <StatusBadge status={state.status} />
              </div>
              <StatusActions
                current={state.status}
                launch={setStateStatus.bind(null, state.id, "active")}
                pause={setStateStatus.bind(null, state.id, "paused")}
                draft={setStateStatus.bind(null, state.id, "draft")}
              />
            </div>

            <h3 className="mt-6 text-sm font-semibold text-slate-700">Passport Areas</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {(areasByState.get(state.id) ?? []).map((area) => (
                <li key={area.id} className="flex items-center justify-between py-2">
                  <Link
                    href={`/admin/areas/${area.id}`}
                    className="text-sm font-medium text-slate-800 hover:underline"
                  >
                    {area.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={area.status} />
                    <StatusActions
                      current={area.status}
                      launch={setAreaStatus.bind(null, area.id, "active")}
                      pause={setAreaStatus.bind(null, area.id, "paused")}
                      draft={setAreaStatus.bind(null, area.id, "draft")}
                    />
                  </div>
                </li>
              ))}
              {(areasByState.get(state.id) ?? []).length === 0 && (
                <li className="py-2 text-sm text-slate-500">No Passport Areas yet.</li>
              )}
            </ul>

            <form
              action={createArea}
              className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
            >
              <input type="hidden" name="state_id" value={state.id} />
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Area name</span>
                <input
                  name="name"
                  required
                  placeholder="Orlando"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Tagline</span>
                <input
                  name="tagline"
                  placeholder="Theme parks, dining, and more"
                  className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
                Add area
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusActions({
  current,
  launch,
  pause,
  draft,
}: {
  current: string;
  launch: () => Promise<void>;
  pause: () => Promise<void>;
  draft: () => Promise<void>;
}) {
  return (
    <div className="flex gap-2 text-xs">
      {current !== "active" && (
        <form action={launch}>
          <button className="rounded-full bg-green-600 px-3 py-1 font-semibold text-white hover:bg-green-500">
            Launch
          </button>
        </form>
      )}
      {current === "active" && (
        <form action={pause}>
          <button className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-400">
            Pause
          </button>
        </form>
      )}
      {current !== "draft" && (
        <form action={draft}>
          <button className="rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-300">
            Move to draft
          </button>
        </form>
      )}
    </div>
  );
}
