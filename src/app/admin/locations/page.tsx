import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, hasStateCapability } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { NO_MATCH_ID } from "@/lib/admin-scope";
import type { PassportArea, State } from "@/lib/types/domain";
import {
  createState,
  setStateStatus,
  updateStateDetails,
  createArea,
  setAreaStatus,
  addStateManager,
  removeStateManager,
} from "./actions";
import { StatusBadge } from "@/components/status-badge";
import { Overlay } from "@/components/admin/overlay";

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

export default async function LocationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; mode?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/locations");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0) redirect("/admin");

  const { state: stateSlug, mode } = await searchParams;
  const supabase = await createClient();

  let statesQuery = supabase.from("states").select("*").order("name");
  if (!isNationalAdmin) {
    const stateIds = currentUser.stateAssignments.map((s) => s.state_id);
    statesQuery = statesQuery.in("id", stateIds.length ? stateIds : [NO_MATCH_ID]);
  }
  const { data: states } = await statesQuery.returns<State[]>();

  const selected = stateSlug ? (states ?? []).find((s) => s.slug === stateSlug) ?? null : null;

  let areas: PassportArea[] = [];
  let stateManagers: StateManagerRow[] = [];
  if (selected) {
    const [{ data: areaRows }, { data: mgrRows }] = await Promise.all([
      supabase
        .from("passport_areas")
        .select("*")
        .eq("state_id", selected.id)
        .order("name")
        .returns<PassportArea[]>(),
      isNationalAdmin
        ? supabase
            .from("state_assignments")
            .select(
              "id, can_view_metrics, can_manage_businesses, can_manage_offers, can_manage_subareas, can_submit_marketing_requests, can_manage_staff, profiles:user_id(email)"
            )
            .eq("state_id", selected.id)
        : Promise.resolve({ data: null }),
    ]);
    areas = areaRows ?? [];
    stateManagers = (mgrRows ?? []) as unknown as StateManagerRow[];
  }

  const canEditRegions = selected ? hasStateCapability(currentUser, selected.id, "manage_subareas") : false;
  const canEdit = isNationalAdmin || canEditRegions;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">States &amp; Passport Areas</h1>
      <p className="mt-1 text-slate-600">
        {isNationalAdmin
          ? "Select a state to view or edit it, its regions, and its managers."
          : "Select your state to view or edit its regions and their managers."}
      </p>

      {isNationalAdmin && (
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
      )}

      <ul className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {(states ?? []).map((state) => (
          <li key={state.id} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800">
                {state.name} ({state.abbreviation})
              </span>
              <StatusBadge status={state.status} />
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold text-slate-700">
              <Link href={`/admin/locations?state=${state.slug}&mode=view`} className="hover:underline">
                View
              </Link>
              <Link href={`/admin/locations?state=${state.slug}&mode=edit`} className="hover:underline">
                Edit
              </Link>
            </div>
          </li>
        ))}
        {(states ?? []).length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No states yet.</li>
        )}
      </ul>

      {selected && (
        <Overlay closeHref="/admin/locations">
          {mode === "edit" && canEdit ? (
            <StateEditPanel
              state={selected}
              areas={areas}
              stateManagers={stateManagers}
              isNationalAdmin={isNationalAdmin}
              canEditRegions={canEditRegions}
            />
          ) : (
            <StateViewPanel
              state={selected}
              areas={areas}
              stateManagers={stateManagers}
              isNationalAdmin={isNationalAdmin}
              canEdit={canEdit}
            />
          )}
        </Overlay>
      )}
    </div>
  );
}

function StateViewPanel({
  state,
  areas,
  stateManagers,
  isNationalAdmin,
  canEdit,
}: {
  state: State;
  areas: PassportArea[];
  stateManagers: StateManagerRow[];
  isNationalAdmin: boolean;
  canEdit: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-900">
          {state.name} ({state.abbreviation})
        </h2>
        <StatusBadge status={state.status} />
      </div>
      {state.intro_copy && <p className="mt-2 text-sm text-slate-600">{state.intro_copy}</p>}

      <h3 className="mt-6 text-sm font-semibold text-slate-700">Regions</h3>
      <ul className="mt-2 divide-y divide-slate-100">
        {areas.map((area) => (
          <li key={area.id} className="flex items-center justify-between py-2">
            <Link href={`/admin/areas/${area.id}`} className="text-sm font-medium text-slate-800 hover:underline">
              {area.name}
            </Link>
            <StatusBadge status={area.status} />
          </li>
        ))}
        {areas.length === 0 && <li className="py-2 text-sm text-slate-500">No regions yet.</li>}
      </ul>

      {isNationalAdmin && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-slate-700">State managers</h3>
          <ul className="mt-2 space-y-1">
            {stateManagers.map((m) => (
              <li key={m.id} className="text-sm text-slate-600">
                {m.profiles?.email ?? "Unknown"}
              </li>
            ))}
            {stateManagers.length === 0 && (
              <li className="text-sm text-slate-500">No state managers assigned.</li>
            )}
          </ul>
        </>
      )}

      {canEdit && (
        <Link
          href={`/admin/locations?state=${state.slug}&mode=edit`}
          className="mt-6 inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Edit
        </Link>
      )}
    </div>
  );
}

function StateEditPanel({
  state,
  areas,
  stateManagers,
  isNationalAdmin,
  canEditRegions,
}: {
  state: State;
  areas: PassportArea[];
  stateManagers: StateManagerRow[];
  isNationalAdmin: boolean;
  canEditRegions: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Edit {state.name}</h2>

      {isNationalAdmin && (
        <>
          <form action={updateStateDetails.bind(null, state.id)} className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Name</span>
              <input
                name="name"
                defaultValue={state.name}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Abbreviation</span>
              <input
                name="abbreviation"
                defaultValue={state.abbreviation}
                required
                maxLength={2}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Intro copy</span>
              <textarea
                name="intro_copy"
                defaultValue={state.intro_copy ?? ""}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Save changes
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-600">Status:</span>
            <StatusBadge status={state.status} />
            <StatusActions
              current={state.status}
              launch={setStateStatus.bind(null, state.id, "active")}
              pause={setStateStatus.bind(null, state.id, "paused")}
              draft={setStateStatus.bind(null, state.id, "draft")}
            />
          </div>
        </>
      )}

      <h3 className="mt-6 text-sm font-semibold text-slate-700">Regions</h3>
      <ul className="mt-2 divide-y divide-slate-100">
        {areas.map((area) => (
          <li key={area.id} className="flex items-center justify-between py-2">
            <Link href={`/admin/areas/${area.id}`} className="text-sm font-medium text-slate-800 hover:underline">
              {area.name}
            </Link>
            <div className="flex items-center gap-3">
              <StatusBadge status={area.status} />
              {canEditRegions && (
                <StatusActions
                  current={area.status}
                  launch={setAreaStatus.bind(null, area.id, "active")}
                  pause={setAreaStatus.bind(null, area.id, "paused")}
                  draft={setAreaStatus.bind(null, area.id, "draft")}
                />
              )}
            </div>
          </li>
        ))}
        {areas.length === 0 && <li className="py-2 text-sm text-slate-500">No regions yet.</li>}
      </ul>

      {canEditRegions && (
        <form action={createArea} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <input type="hidden" name="state_id" value={state.id} />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Region name</span>
            <input
              name="name"
              required
              placeholder="Miami"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Tagline</span>
            <input
              name="tagline"
              placeholder="Beaches, nightlife, and more"
              className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            Add region
          </button>
        </form>
      )}

      {isNationalAdmin && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">State managers</h3>
          <p className="mt-1 text-xs text-slate-500">
            Same capabilities as a region manager, but across every region in{" "}
            {state.name} — current and future.
          </p>
          <ul className="mt-2 space-y-2">
            {stateManagers.map((m) => (
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
            {stateManagers.length === 0 && (
              <li className="text-sm text-slate-500">No state managers assigned yet.</li>
            )}
          </ul>
          <form action={addStateManager.bind(null, state.id)} className="mt-3 space-y-3">
            <input
              name="email"
              type="email"
              required
              placeholder="manager@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
      )}
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
