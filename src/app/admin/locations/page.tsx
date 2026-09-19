import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, hasStateCapability, isStateManager } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { NO_MATCH_ID } from "@/lib/admin-scope";
import type { PassportArea, State } from "@/lib/types/domain";
import {
  setStateStatus,
  updateStateDetails,
  createArea,
  setAreaStatus,
  addStateManager,
  removeStateManager,
} from "./actions";
import { addAreaManager, removeAreaManager } from "../areas/[areaId]/actions";
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

interface AreaManagerRow extends StateManagerRow {
  passport_area_id: string;
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
  let areaManagersByAreaId = new Map<string, AreaManagerRow[]>();
  const canManageUsers = selected ? isNationalAdmin || isStateManager(currentUser, selected.id) : false;

  if (selected) {
    const { data: areaRows } = await supabase
      .from("passport_areas")
      .select("*")
      .eq("state_id", selected.id)
      .order("name")
      .returns<PassportArea[]>();
    areas = areaRows ?? [];
    const areaIds = areas.map((a) => a.id);

    const [{ data: mgrRows }, { data: areaMgrRows }] = await Promise.all([
      isNationalAdmin
        ? supabase
            .from("state_assignments")
            .select(
              "id, can_view_metrics, can_manage_businesses, can_manage_offers, can_manage_subareas, can_submit_marketing_requests, can_manage_staff, profiles:user_id(email)"
            )
            .eq("state_id", selected.id)
        : Promise.resolve({ data: null }),
      canManageUsers && areaIds.length
        ? supabase
            .from("area_assignments")
            .select(
              "id, passport_area_id, can_view_metrics, can_manage_businesses, can_manage_offers, can_manage_subareas, can_submit_marketing_requests, can_manage_staff, profiles:user_id(email)"
            )
            .in("passport_area_id", areaIds)
        : Promise.resolve({ data: null }),
    ]);
    stateManagers = (mgrRows ?? []) as unknown as StateManagerRow[];

    const areaManagers = (areaMgrRows ?? []) as unknown as AreaManagerRow[];
    areaManagersByAreaId = new Map(
      areas.map((a) => [a.id, areaManagers.filter((m) => m.passport_area_id === a.id)])
    );
  }

  const canEditRegions = selected ? hasStateCapability(currentUser, selected.id, "manage_subareas") : false;
  const canEdit = isNationalAdmin || canEditRegions;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">States &amp; Regions</h1>
      <p className="mt-1 text-slate-600">
        {isNationalAdmin
          ? "Select a state to view or edit it, its regions, and its managers."
          : "Select your state to view or edit its regions and their managers."}
      </p>

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
              areaManagersByAreaId={areaManagersByAreaId}
              isNationalAdmin={isNationalAdmin}
              canEditRegions={canEditRegions}
              canManageUsers={canManageUsers}
            />
          ) : (
            <StateViewPanel
              state={selected}
              areas={areas}
              stateManagers={stateManagers}
              areaManagersByAreaId={areaManagersByAreaId}
              isNationalAdmin={isNationalAdmin}
              canEdit={canEdit}
            />
          )}
        </Overlay>
      )}
    </div>
  );
}

function ManagerBadge({ kind }: { kind: "state" | "region" }) {
  return kind === "state" ? (
    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
      State manager
    </span>
  ) : (
    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
      Region manager
    </span>
  );
}

function StateViewPanel({
  state,
  areas,
  stateManagers,
  areaManagersByAreaId,
  isNationalAdmin,
  canEdit,
}: {
  state: State;
  areas: PassportArea[];
  stateManagers: StateManagerRow[];
  areaManagersByAreaId: Map<string, AreaManagerRow[]>;
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
        {areas.map((area) => {
          const managers = areaManagersByAreaId.get(area.id) ?? [];
          return (
            <li key={area.id} className="py-2">
              <div className="flex items-center justify-between">
                <Link href={`/admin/areas/${area.id}`} className="text-sm font-medium text-slate-800 hover:underline">
                  {area.name}
                </Link>
                <StatusBadge status={area.status} />
              </div>
              {managers.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {managers.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <ManagerBadge kind="region" />
                      {m.profiles?.email ?? "Unknown"}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {areas.length === 0 && <li className="py-2 text-sm text-slate-500">No regions yet.</li>}
      </ul>

      {isNationalAdmin && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-slate-700">State managers</h3>
          <ul className="mt-2 space-y-1.5">
            {stateManagers.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm text-slate-600">
                <ManagerBadge kind="state" />
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
  areaManagersByAreaId,
  isNationalAdmin,
  canEditRegions,
  canManageUsers,
}: {
  state: State;
  areas: PassportArea[];
  stateManagers: StateManagerRow[];
  areaManagersByAreaId: Map<string, AreaManagerRow[]>;
  isNationalAdmin: boolean;
  canEditRegions: boolean;
  canManageUsers: boolean;
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
        {areas.map((area) => {
          const managers = areaManagersByAreaId.get(area.id) ?? [];
          return (
            <li key={area.id} className="py-3">
              <div className="flex items-center justify-between">
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
              </div>

              {canManageUsers && (
                <div className="mt-2 rounded-lg bg-slate-50 p-3">
                  <ul className="space-y-1.5">
                    {managers.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs text-slate-600">
                          <ManagerBadge kind="region" />
                          {m.profiles?.email ?? "Unknown"}
                        </span>
                        <form action={removeAreaManager.bind(null, area.id, m.id)}>
                          <button className="text-xs font-semibold text-red-600 hover:text-red-700">
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                    {managers.length === 0 && (
                      <li className="text-xs text-slate-500">No region managers assigned yet.</li>
                    )}
                  </ul>
                  <form action={addAreaManager.bind(null, area.id)} className="mt-2 space-y-2">
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="manager@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                    />
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {CAPABILITY_FIELDS.map((f) => (
                        <label key={f.key} className="flex items-center gap-1 text-xs text-slate-700">
                          <input type="checkbox" name={f.key} defaultChecked={f.key === "can_view_metrics"} />
                          {f.label}
                        </label>
                      ))}
                    </div>
                    <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      Add region manager
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
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
            {state.name} - current and future.
          </p>
          <ul className="mt-2 space-y-2">
            {stateManagers.map((m) => (
              <li key={m.id} className="rounded-lg bg-indigo-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <ManagerBadge kind="state" />
                    {m.profiles?.email ?? "Unknown"}
                  </span>
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
