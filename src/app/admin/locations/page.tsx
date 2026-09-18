import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea, State } from "@/lib/types/domain";
import {
  createState,
  setStateStatus,
  createArea,
  setAreaStatus,
  addStateManager,
  removeStateManager,
} from "./actions";
import { StatusBadge } from "@/components/status-badge";

const CAPABILITY_FIELDS: { key: string; label: string }[] = [
  { key: "can_view_metrics", label: "View metrics" },
  { key: "can_manage_businesses", label: "Manage businesses" },
  { key: "can_manage_offers", label: "Manage offers" },
  { key: "can_manage_subareas", label: "Manage subareas" },
  { key: "can_submit_marketing_requests", label: "Submit marketing requests" },
  { key: "can_manage_staff", label: "Manage local staff" },
];

interface StateManagerRow {
  id: string;
  profiles: { email: string } | null;
  can_view_metrics: boolean;
  can_manage_businesses: boolean;
  can_manage_offers: boolean;
  can_manage_subareas: boolean;
  can_submit_marketing_requests: boolean;
  can_manage_staff: boolean;
}

export default async function LocationsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const supabase = await createClient();
  const [{ data: states }, { data: areas }, { data: stateManagers }] = await Promise.all([
    supabase.from("states").select("*").order("name").returns<State[]>(),
    supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
    supabase
      .from("state_assignments")
      .select(
        "id, state_id, can_view_metrics, can_manage_businesses, can_manage_offers, can_manage_subareas, can_submit_marketing_requests, can_manage_staff, profiles:user_id(email)"
      ),
  ]);

  const areasByState = new Map<string, PassportArea[]>();
  for (const area of areas ?? []) {
    const list = areasByState.get(area.state_id) ?? [];
    list.push(area);
    areasByState.set(area.state_id, list);
  }

  const managersByState = new Map<string, StateManagerRow[]>();
  for (const m of (stateManagers ?? []) as unknown as (StateManagerRow & { state_id: string })[]) {
    const list = managersByState.get(m.state_id) ?? [];
    list.push(m);
    managersByState.set(m.state_id, list);
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

            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700">State managers</h3>
              <p className="mt-1 text-xs text-slate-500">
                Same capabilities as a Passport Area manager, but across every
                area in {state.name} — current and future.
              </p>
              <ul className="mt-2 space-y-2">
                {(managersByState.get(state.id) ?? []).map((m) => (
                  <li key={m.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{m.profiles?.email ?? "Unknown"}</span>
                      <form action={removeStateManager.bind(null, m.id)}>
                        <button className="text-xs font-semibold text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      </form>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {CAPABILITY_FIELDS.filter((f) => (m as unknown as Record<string, boolean>)[f.key])
                        .map((f) => f.label)
                        .join(", ") || "No capabilities granted"}
                    </p>
                  </li>
                ))}
                {(managersByState.get(state.id) ?? []).length === 0 && (
                  <li className="text-sm text-slate-500">No state managers assigned yet.</li>
                )}
              </ul>
              <form action={addStateManager.bind(null, state.id)} className="mt-3 space-y-3">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="manager@example.com"
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {CAPABILITY_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <input type="checkbox" name={f.key} defaultChecked={f.key === "can_view_metrics"} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Assign state manager
                </button>
              </form>
            </div>
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
