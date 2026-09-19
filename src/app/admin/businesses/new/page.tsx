import { redirect } from "next/navigation";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea, State } from "@/lib/types/domain";
import { createBusinessNational } from "./actions";

export default async function NewBusinessPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/businesses/new");

  const supabase = await createClient();
  const [{ data: areas }, { data: states }] = await Promise.all([
    supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
    supabase.from("states").select("*").order("name").returns<State[]>(),
  ]);

  const stateById = new Map((states ?? []).map((s) => [s.id, s]));
  const manageableAreas = (areas ?? []).filter((a) =>
    canManageArea(currentUser, a.id, "manage_businesses", a.state_id)
  );

  if (manageableAreas.length === 0) redirect("/admin/businesses");

  const areasByState = new Map<string, PassportArea[]>();
  for (const area of manageableAreas) {
    const list = areasByState.get(area.state_id) ?? [];
    list.push(area);
    areasByState.set(area.state_id, list);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Add a business</h1>
      <p className="mt-1 text-slate-600">
        Pick the region it belongs to and give it a name - everything else
        (contact info, hours, media, offers) gets filled in on its profile
        page next.
      </p>

      <form action={createBusinessNational} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Region</span>
          <select
            name="area_id"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choose a region&hellip;</option>
            {[...areasByState.entries()].map(([stateId, stateAreas]) => (
              <optgroup key={stateId} label={stateById.get(stateId)?.name ?? "Unknown state"}>
                {stateAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Business name</span>
          <input
            name="name"
            required
            placeholder="The Salty Pelican"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Create business
        </button>
      </form>
    </div>
  );
}
