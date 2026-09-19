import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCurrentAdminScope, getAllStatesForAdmin, NO_MATCH_ID } from "@/lib/admin-scope";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { createCategory, renameCategory, deleteCategory } from "./actions";
import type { Category, State } from "@/lib/types/domain";

export default async function CategoriesAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/categories");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0) redirect("/admin");

  let states: State[];
  if (isNationalAdmin) {
    const { state: scopeState } = await getCurrentAdminScope();
    states = scopeState ? [scopeState] : await getAllStatesForAdmin();
  } else {
    const stateIds = [...new Set(currentUser.stateAssignments.map((s) => s.state_id))];
    const supabase = await createClient();
    const { data } = await supabase
      .from("states")
      .select("*")
      .in("id", stateIds.length ? stateIds : [NO_MATCH_ID])
      .order("name")
      .returns<State[]>();
    states = data ?? [];
  }

  const categories = await getCategories(states.map((s) => s.id));
  const categoriesByState = new Map<string, Category[]>();
  for (const c of categories) {
    const list = categoriesByState.get(c.state_id) ?? [];
    list.push(c);
    categoriesByState.set(c.state_id, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
      <p className="mt-1 text-slate-600">
        Each state has its own taxonomy businesses in it are tagged with
        (Restaurants, Attractions, ...).
      </p>

      <div className="mt-8 space-y-8">
        {states.map((state) => (
          <div key={state.id} className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">{state.name}</h2>

            <ul className="mt-4 divide-y divide-slate-100">
              {(categoriesByState.get(state.id) ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <form action={renameCategory.bind(null, c.id)} className="flex flex-1 items-center gap-3">
                    <input
                      name="name"
                      defaultValue={c.name}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      Save
                    </button>
                  </form>
                  <form action={deleteCategory.bind(null, c.id)}>
                    <button className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-400">
                      Delete
                    </button>
                  </form>
                </li>
              ))}
              {(categoriesByState.get(state.id) ?? []).length === 0 && (
                <li className="py-3 text-sm text-slate-500">No categories for {state.name} yet.</li>
              )}
            </ul>

            <form
              action={createCategory.bind(null, state.id)}
              className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
            >
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Name</span>
                <input
                  name="name"
                  required
                  placeholder="Nightlife"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Add category
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
