import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, canManageArea, isStateManager } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Business, BusinessApprovalStatus, MarketingRequest, PassportArea, Subarea } from "@/lib/types/domain";
import { StatusBadge } from "@/components/status-badge";
import {
  createSubarea,
  setSubareaStatus,
  createBusiness,
  setBusinessStatus,
  addStaff,
  removeStaff,
  addAreaManager,
  removeAreaManager,
  createMarketingRequest,
} from "./actions";
import { setBusinessApproval, setBusinessFeatured } from "../../businesses/actions";

const APPROVAL_STYLES: Record<BusinessApprovalStatus, string> = {
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

const APPROVAL_LABELS: Record<BusinessApprovalStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const CAPABILITY_FIELDS: { key: string; label: string }[] = [
  { key: "can_view_metrics", label: "View metrics" },
  { key: "can_manage_businesses", label: "Manage businesses" },
  { key: "can_manage_offers", label: "Manage offers" },
  { key: "can_manage_subareas", label: "Manage subareas" },
  { key: "can_submit_marketing_requests", label: "Submit marketing requests" },
  { key: "can_manage_staff", label: "Manage local staff" },
];

interface Props {
  params: Promise<{ areaId: string }>;
}

export default async function AreaWorkspacePage({ params }: Props) {
  const { areaId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const supabase = await createClient();
  const { data: area } = await supabase
    .from("passport_areas")
    .select("*")
    .eq("id", areaId)
    .maybeSingle<PassportArea>();
  if (!area) notFound();

  const canView = canManageArea(currentUser, areaId, "view_metrics", area.state_id);
  const canBusinesses = canManageArea(currentUser, areaId, "manage_businesses", area.state_id);
  const canSubareas = canManageArea(currentUser, areaId, "manage_subareas", area.state_id);
  const canStaff = canManageArea(currentUser, areaId, "manage_staff", area.state_id);
  const canMarketing = canManageArea(currentUser, areaId, "submit_marketing_requests", area.state_id);

  if (!canView && !canBusinesses && !canSubareas && !canStaff && !canMarketing) {
    redirect("/admin");
  }

  // A state manager for this area's state can manage the region-manager
  // roster too (not just national admins) — RLS enforces the actual
  // capability ceiling on what they can grant; this just decides whether
  // to show the section at all.
  const isNationalAdmin = currentUser.isNationalAdmin;
  const canManageUsers = isNationalAdmin || isStateManager(currentUser, area.state_id);
  const ownStateAssignment = currentUser.stateAssignments.find((s) => s.state_id === area.state_id);
  function canGrant(key: string): boolean {
    if (isNationalAdmin) return true;
    if (!ownStateAssignment) return false;
    return Boolean((ownStateAssignment as unknown as Record<string, boolean>)[key]);
  }

  const [{ data: subareas }, { data: businesses }, { data: staff }, { data: requests }, { data: managers }] =
    await Promise.all([
      supabase.from("subareas").select("*").eq("passport_area_id", areaId).order("name").returns<Subarea[]>(),
      supabase
        .from("businesses")
        .select("*")
        .eq("passport_area_id", areaId)
        .order("name")
        .returns<Business[]>(),
      canStaff
        ? supabase
            .from("local_staff")
            .select("id, business_id, profiles:user_id(email)")
            .eq("passport_area_id", areaId)
        : Promise.resolve({ data: null }),
      canMarketing
        ? supabase
            .from("marketing_requests")
            .select("*")
            .eq("passport_area_id", areaId)
            .order("created_at", { ascending: false })
            .returns<MarketingRequest[]>()
        : Promise.resolve({ data: null }),
      canManageUsers
        ? supabase
            .from("area_assignments")
            .select(
              "id, can_view_metrics, can_manage_businesses, can_manage_offers, can_manage_subareas, can_submit_marketing_requests, can_manage_staff, profiles:user_id(email)"
            )
            .eq("passport_area_id", areaId)
        : Promise.resolve({ data: null }),
    ]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{area.name}</h1>
        <StatusBadge status={area.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        State/area lifecycle (launch/pause) is managed by national admins under
        States &amp; Regions.
      </p>

      {canSubareas && (
        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Subareas</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {(subareas ?? []).map((subarea) => (
              <li key={subarea.id} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-slate-800">{subarea.name}</span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={subarea.status} />
                  {subarea.status !== "active" ? (
                    <form action={setSubareaStatus.bind(null, areaId, subarea.id, "active")}>
                      <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                        Launch
                      </button>
                    </form>
                  ) : (
                    <form action={setSubareaStatus.bind(null, areaId, subarea.id, "paused")}>
                      <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400">
                        Pause
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
            {(subareas ?? []).length === 0 && (
              <li className="py-2 text-sm text-slate-500">No subareas yet.</li>
            )}
          </ul>
          <form action={createSubarea.bind(null, areaId)} className="mt-4 flex items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Subarea name</span>
              <input name="name" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
              Add subarea
            </button>
          </form>
        </section>
      )}

      {(canBusinesses || canView) && (
        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Businesses</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {(businesses ?? []).map((business) => (
              <li key={business.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link
                    href={`/admin/areas/${areaId}/businesses/${business.id}`}
                    className="text-sm font-medium text-slate-800 hover:underline"
                  >
                    {business.name}
                  </Link>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[business.approval_status]}`}
                  >
                    {APPROVAL_LABELS[business.approval_status]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={business.status} />
                  {canBusinesses && business.approval_status === "pending_review" && (
                    <>
                      <form action={setBusinessApproval.bind(null, business.id, "approved")}>
                        <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                          Approve
                        </button>
                      </form>
                      <form action={setBusinessApproval.bind(null, business.id, "rejected")}>
                        <button className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">
                          Reject
                        </button>
                      </form>
                    </>
                  )}
                  {canBusinesses && business.approval_status === "rejected" && (
                    <form action={setBusinessApproval.bind(null, business.id, "approved")}>
                      <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                        Approve anyway
                      </button>
                    </form>
                  )}
                  {canBusinesses && business.approval_status === "approved" && (
                    <form action={setBusinessFeatured.bind(null, business.id, !business.featured)}>
                      <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                        {business.featured ? "Unfeature" : "Feature"}
                      </button>
                    </form>
                  )}
                  {canBusinesses &&
                    (business.status !== "active" ? (
                      <form action={setBusinessStatus.bind(null, areaId, business.id, "active")}>
                        <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                          Launch
                        </button>
                      </form>
                    ) : (
                      <form action={setBusinessStatus.bind(null, areaId, business.id, "paused")}>
                        <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400">
                          Pause
                        </button>
                      </form>
                    ))}
                </div>
              </li>
            ))}
            {(businesses ?? []).length === 0 && (
              <li className="py-2 text-sm text-slate-500">No businesses yet.</li>
            )}
          </ul>
          {canBusinesses && (
            <form action={createBusiness.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Business name</span>
                <input name="name" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">City</span>
                <input name="city" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              {(subareas ?? []).length > 0 && (
                <label className="text-sm">
                  <span className="mb-1 block text-slate-600">Subarea</span>
                  <select name="subarea_id" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">None</option>
                    {(subareas ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
                Add business
              </button>
            </form>
          )}
        </section>
      )}

      {canStaff && (
        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Local staff</h2>
          <p className="mt-1 text-sm text-slate-500">
            Staff can check in Passport holders and log redemptions at
            businesses in this area. They must have already signed in once.
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {((staff ?? []) as unknown as { id: string; profiles: { email: string } | null }[]).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-800">{s.profiles?.email ?? "Unknown"}</span>
                <form action={removeStaff.bind(null, areaId, s.id)}>
                  <button className="text-xs font-semibold text-red-600 hover:text-red-700">
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {(staff ?? []).length === 0 && (
              <li className="py-2 text-sm text-slate-500">No staff added yet.</li>
            )}
          </ul>
          <form action={addStaff.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Staff email</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            {(businesses ?? []).length > 0 && (
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Business (optional)</span>
                <select name="business_id" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Whole area</option>
                  {(businesses ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
              Add staff
            </button>
          </form>
        </section>
      )}

      {canManageUsers && (
        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Managers &amp; franchisees</h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign who can manage this area and exactly what they can do
            here. National admins always retain full access regardless of
            what&apos;s granted below.
            {!isNationalAdmin && " You can only grant capabilities you hold yourself."}
          </p>
          <ul className="mt-3 space-y-2">
            {(
              (managers ?? []) as unknown as {
                id: string;
                profiles: { email: string } | null;
                can_view_metrics: boolean;
                can_manage_businesses: boolean;
                can_manage_offers: boolean;
                can_manage_subareas: boolean;
                can_submit_marketing_requests: boolean;
                can_manage_staff: boolean;
              }[]
            ).map((m) => (
              <li key={m.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{m.profiles?.email ?? "Unknown"}</span>
                  <form action={removeAreaManager.bind(null, areaId, m.id)}>
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
            {(managers ?? []).length === 0 && (
              <li className="text-sm text-slate-500">No managers assigned yet.</li>
            )}
          </ul>
          <form action={addAreaManager.bind(null, areaId)} className="mt-4 space-y-3">
            <input
              name="email"
              type="email"
              required
              placeholder="manager@example.com"
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CAPABILITY_FIELDS.map((f) => {
                const allowed = canGrant(f.key);
                return (
                  <label
                    key={f.key}
                    className={`flex items-center gap-1.5 text-sm ${allowed ? "text-slate-700" : "text-slate-300"}`}
                  >
                    <input
                      type="checkbox"
                      name={f.key}
                      disabled={!allowed}
                      defaultChecked={allowed && f.key === "can_view_metrics"}
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Assign manager
            </button>
          </form>
        </section>
      )}

      {canMarketing && (
        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Marketing requests</h2>
          <ul className="mt-3 space-y-2">
            {(requests ?? []).map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{r.title}</span>
                  <span className="text-xs font-semibold capitalize text-slate-500">{r.status}</span>
                </div>
                {r.details && <p className="mt-1 text-sm text-slate-600">{r.details}</p>}
                {r.admin_notes && (
                  <p className="mt-1 text-xs text-slate-500">National admin note: {r.admin_notes}</p>
                )}
              </li>
            ))}
            {(requests ?? []).length === 0 && (
              <li className="text-sm text-slate-500">No requests submitted yet.</li>
            )}
          </ul>
          <form action={createMarketingRequest.bind(null, areaId)} className="mt-4 space-y-3">
            <input
              name="title"
              required
              placeholder="Request title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              name="details"
              placeholder="Details"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Submit request
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
