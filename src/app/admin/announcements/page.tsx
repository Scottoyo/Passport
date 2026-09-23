import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds, hasAnyCapability } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getAllStatesForAdmin } from "@/lib/admin-scope";
import { ScopeSelect, type ScopeStateOption } from "@/components/admin/scope-select";
import type { AdminAnnouncement, PassportArea, State } from "@/lib/types/domain";
import { createAnnouncement } from "./actions";
import { buttonClasses } from "@/lib/ui-classes";

export default async function AnnouncementsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/announcements");
  if (!hasAnyCapability(currentUser, "manage_announcements")) redirect("/admin");

  const isNationalAdmin = currentUser.isNationalAdmin;
  const supabase = await createClient();

  // RLS already scopes this exactly right: a manager sees announcements in
  // their own scope or above, a national admin sees everything - no
  // app-layer filtering needed for the list itself.
  const { data: announcements } = await supabase
    .from("admin_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<AdminAnnouncement[]>();
  const allAnnouncements = announcements ?? [];

  const stateIds = [...new Set(allAnnouncements.map((a) => a.scope_state_id).filter((id): id is string => Boolean(id)))];
  const areaIds = [...new Set(allAnnouncements.map((a) => a.scope_area_id).filter((id): id is string => Boolean(id)))];
  const [{ data: nameStates }, { data: nameAreas }] = await Promise.all([
    stateIds.length ? supabase.from("states").select("id, name").in("id", stateIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    areaIds.length ? supabase.from("passport_areas").select("id, name").in("id", areaIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const stateNameById = new Map((nameStates ?? []).map((s) => [s.id as string, s.name as string]));
  const areaNameById = new Map((nameAreas ?? []).map((a) => [a.id as string, a.name as string]));

  // Same scope-resolution shape as promo-codes' create form.
  let scopeStates: ScopeStateOption[] = [];
  let fixedAreaLabel: string | null = null;
  let fixedAreaId: string | null = null;
  let multiRegionOptions: { value: string; label: string }[] | null = null;

  if (isNationalAdmin) {
    const [allStates, { data: allAreas }] = await Promise.all([
      getAllStatesForAdmin(),
      supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
    ]);
    scopeStates = allStates.map((s) => ({
      id: s.id,
      name: s.name,
      areas: (allAreas ?? []).filter((a) => a.state_id === s.id).map((a) => ({ id: a.id, name: a.name })),
    }));
  } else if (currentUser.stateAssignments.length > 0) {
    const myStateIds = [...new Set(currentUser.stateAssignments.map((s) => s.state_id))];
    const [{ data: myStates }, { data: myAreas }] = await Promise.all([
      supabase.from("states").select("*").in("id", myStateIds).order("name").returns<State[]>(),
      supabase.from("passport_areas").select("*").in("state_id", myStateIds).order("name").returns<PassportArea[]>(),
    ]);
    scopeStates = (myStates ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      areas: (myAreas ?? []).filter((a) => a.state_id === s.id).map((a) => ({ id: a.id, name: a.name })),
    }));
  } else {
    const accessibleAreaIds = await getAccessibleAreaIds(currentUser);
    if (accessibleAreaIds.length <= 1) {
      const areaId = accessibleAreaIds[0];
      const { data: area } = areaId
        ? await supabase.from("passport_areas").select("id, name").eq("id", areaId).maybeSingle()
        : { data: null };
      fixedAreaLabel = area ? (area.name as string) : null;
      fixedAreaId = areaId ?? null;
    } else {
      const { data: myAreas } = await supabase
        .from("passport_areas")
        .select("id, name")
        .in("id", accessibleAreaIds)
        .order("name");
      multiRegionOptions = (myAreas ?? []).map((a) => ({ value: `area:${a.id}`, label: a.name as string }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Announcements</h1>
      <p className="mt-1 text-ink-muted">
        Broadcast a message to passport holders and business owners. National admins can send nationwide, state, or
        region announcements; state managers within their state; region managers within their region.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-ink">Send an announcement</h2>
        <form action={createAnnouncement} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Title</span>
            <input
              name="title"
              required
              placeholder="New savings this month"
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Message</span>
            <textarea
              name="body"
              required
              rows={4}
              placeholder="Tell your recipients what's new..."
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          {fixedAreaLabel ? (
            <>
              <input type="hidden" name="scope" value={`area:${fixedAreaId ?? ""}`} />
              <p className="text-sm text-ink-muted">
                Scope: <span className="font-semibold">{fixedAreaLabel}</span>
              </p>
            </>
          ) : multiRegionOptions ? (
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Region</span>
              <select name="scope" className="rounded-lg border border-border px-3 py-2 text-sm">
                {multiRegionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <ScopeSelect states={scopeStates} allowNational={isNationalAdmin} />
          )}
          <button className={buttonClasses("primary")}>Send announcement</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-ink">Past announcements</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allAnnouncements.map((a) => {
                const scopeLabel = a.scope_area_id
                  ? (areaNameById.get(a.scope_area_id) ?? "Unknown region")
                  : a.scope_state_id
                    ? `All of ${stateNameById.get(a.scope_state_id) ?? "Unknown state"}`
                    : "National";
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{a.title}</td>
                    <td className="px-4 py-3 text-ink-muted">{scopeLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{a.body}</td>
                  </tr>
                );
              })}
              {allAnnouncements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                    No announcements sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
