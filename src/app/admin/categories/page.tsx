import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getCategories } from "@/lib/queries";
import { createCategory, renameCategory, deleteCategory } from "./actions";

export default async function CategoriesAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isNationalAdmin) redirect("/admin");

  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
      <p className="mt-1 text-slate-600">
        The national taxonomy businesses are tagged with (Restaurants,
        Attractions, ...). One list, shared by every state — no state filter
        here.
      </p>

      <section className="mt-8 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Add a category</h2>
        <form action={createCategory} className="mt-4 flex flex-wrap items-end gap-3">
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
      </section>

      <ul className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-4 px-6 py-3">
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
        {categories.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No categories yet.</li>
        )}
      </ul>
    </div>
  );
}
