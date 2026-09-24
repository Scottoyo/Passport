import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, canManageArea, isStateManager } from "@/lib/permissions";
import { getAllStatesForAdmin } from "@/lib/admin-scope";
import { createClient } from "@/lib/supabase/server";
import type { Business, BusinessApprovalStatus, MarketingRequest, PassportArea, Subarea } from "@/lib/types/domain";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/lib/ui-classes";
import { SaveButton } from "@/components/save-button";
import { SingleFileUploadForm } from "@/components/single-file-upload-form";
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
  updateAreaBranding,
  resetAreaBranding,
  uploadAreaHeroImage,
  updateAreaSecondaryStates,
} from "./actions";
import { setBusinessApproval, featureBusiness, unfeatureBusiness } from "../../businesses/actions";
import { featuredStatusLabel } from "@/lib/business-featured";

const APPROVAL_STYLES: Record<BusinessApprovalStatus, string> = {
  pending_review: "bg-warning-bg text-warning",
  approved: "bg-success-bg text-success",
  rejected: "bg-error-bg text-error",
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
  { key: "can_manage_leads", label: "Manage leads (CRM)" },
  { key: "can_manage_branding", label: "Manage branding" },
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
  const canBranding = canManageArea(currentUser, areaId, "manage_branding", area.state_id);

  if (!canView && !canBusinesses && !canSubareas && !canStaff && !canMarketing && !canBranding) {
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

  const [
    { data: subareas },
    { data: businesses },
    { data: staff },
    { data: requests },
    { data: managers },
    allStates,
    { data: secondaryLinks },
  ] = await Promise.all([
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
            "id, can_view_metrics, can_manage_businesses, can_manage_offers, can_manage_subareas, can_submit_marketing_requests, can_manage_staff, can_manage_leads, can_manage_branding, profiles:user_id(email)"
          )
          .eq("passport_area_id", areaId)
      : Promise.resolve({ data: null }),
    isNationalAdmin ? getAllStatesForAdmin() : Promise.resolve([]),
    isNationalAdmin
      ? supabase.from("passport_area_secondary_states").select("state_id").eq("passport_area_id", areaId)
      : Promise.resolve({ data: null }),
  ]);

  const otherStates = allStates.filter((s) => s.id !== area.state_id);
  const secondaryStateIds = new Set((secondaryLinks ?? []).map((l) => l.state_id as string));

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">{area.name}</h1>
        <StatusBadge status={area.status} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        State/area lifecycle (launch/pause) is managed by national admins under
        States &amp; Regions.
      </p>

      {canBranding && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Branding</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sets this region&apos;s colors and hero image across its public pages and, for its passport
            holders, their account pages too. Any field left unset inherits from the state, then the
            app&apos;s default look.
          </p>
          <form action={updateAreaBranding.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Primary color</span>
              <input
                name="brand_primary_color"
                type="color"
                defaultValue={area.brand_primary_color ?? "#0f172a"}
                className="h-10 w-16 rounded-lg border border-border"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Secondary color</span>
              <input
                name="brand_secondary_color"
                type="color"
                defaultValue={area.brand_secondary_color ?? "#1e293b"}
                className="h-10 w-16 rounded-lg border border-border"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Accent color</span>
              <input
                name="brand_accent_color"
                type="color"
                defaultValue={area.brand_accent_color ?? "#f04a1d"}
                className="h-10 w-16 rounded-lg border border-border"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Text color</span>
              <input
                name="brand_text_color"
                type="color"
                defaultValue={area.brand_text_color ?? "#172e3d"}
                className="h-10 w-16 rounded-lg border border-border"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Background color</span>
              <input
                name="brand_background_color"
                type="color"
                defaultValue={area.brand_background_color ?? "#fff7e8"}
                className="h-10 w-16 rounded-lg border border-border"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Hero overlay</span>
              <select
                name="brand_hero_overlay"
                defaultValue={area.brand_hero_overlay ?? "scrim"}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="scrim">Gradient scrim</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Logo URL (optional)</span>
              <input
                name="brand_logo_url"
                type="url"
                defaultValue={area.brand_logo_url ?? ""}
                placeholder="https://..."
                className="w-64 rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <SaveButton>Save branding</SaveButton>
          </form>
          {(area.brand_primary_color ||
            area.brand_secondary_color ||
            area.brand_accent_color ||
            area.brand_text_color ||
            area.brand_background_color ||
            area.brand_hero_overlay ||
            area.brand_logo_url) && (
            <form action={resetAreaBranding.bind(null, areaId)} className="mt-3">
              <button className="text-xs font-semibold text-error hover:text-red-700">
                Reset to default
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <SingleFileUploadForm
              action={uploadAreaHeroImage.bind(null, areaId)}
              fieldName="hero_image"
              label="Upload hero image"
            />
            {area.hero_image_url && (
              <span className="text-xs text-ink-muted">Current hero image is set.</span>
            )}
          </div>
        </section>
      )}

      {isNationalAdmin && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Also show on these state pages</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {area.name} always lives at its own page under its primary state. Selecting another
            state below also lists it on that state&apos;s page - labeled with the primary
            state&apos;s abbreviation - and links back to this same region. It does not create a
            second copy of it.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-brand-primary">Edit</summary>
            <form action={updateAreaSecondaryStates.bind(null, areaId)} className="mt-3 space-y-3">
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
                {otherStates.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="secondary_state_ids"
                      value={s.id}
                      defaultChecked={secondaryStateIds.has(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
                {otherStates.length === 0 && (
                  <p className="text-sm text-ink-muted">No other states exist yet.</p>
                )}
              </div>
              <SaveButton>Save states</SaveButton>
            </form>
          </details>
          {secondaryStateIds.size > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              Currently also shown on:{" "}
              {otherStates
                .filter((s) => secondaryStateIds.has(s.id))
                .map((s) => s.name)
                .join(", ")}
              .
            </p>
          )}
        </section>
      )}

      {canSubareas && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Subareas</h2>
          <ul className="mt-3 divide-y divide-border">
            {(subareas ?? []).map((subarea) => (
              <li key={subarea.id} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-ink">{subarea.name}</span>
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
              <li className="py-2 text-sm text-ink-muted">No subareas yet.</li>
            )}
          </ul>
          <form action={createSubarea.bind(null, areaId)} className="mt-4 flex items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Subarea name</span>
              <input name="name" required className="rounded-lg border border-border px-3 py-2 text-sm" />
            </label>
            <button className={buttonClasses("outline")}>
              Add subarea
            </button>
          </form>
        </section>
      )}

      {(canBusinesses || canView) && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Businesses</h2>
          <ul className="mt-3 divide-y divide-border">
            {(businesses ?? []).map((business) => (
              <li key={business.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link
                    href={`/admin/areas/${areaId}/businesses/${business.id}`}
                    className="text-sm font-medium text-ink hover:underline"
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
                  {business.featured && (
                    <span className="text-xs text-ink-muted">{featuredStatusLabel(business)}</span>
                  )}
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
                      <button className={buttonClasses("outline", "sm")}>
                        Approve anyway
                      </button>
                    </form>
                  )}
                  {canBusinesses && business.approval_status === "approved" && (
                    business.featured ? (
                      <form action={unfeatureBusiness.bind(null, business.id)}>
                        <button className={buttonClasses("outline", "sm")}>Unfeature</button>
                      </form>
                    ) : (
                      <>
                        <form action={featureBusiness.bind(null, business.id)}>
                          <input type="hidden" name="preset" value="7" />
                          <button className={buttonClasses("outline", "sm")}>Feature 7d</button>
                        </form>
                        <form action={featureBusiness.bind(null, business.id)}>
                          <input type="hidden" name="preset" value="30" />
                          <button className={buttonClasses("outline", "sm")}>Feature 30d</button>
                        </form>
                        <Link
                          href={`/admin/areas/${areaId}/businesses/${business.id}`}
                          className={buttonClasses("outline", "sm")}
                        >
                          Custom…
                        </Link>
                      </>
                    )
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
              <li className="py-2 text-sm text-ink-muted">No businesses yet.</li>
            )}
          </ul>
          {canBusinesses && (
            <form action={createBusiness.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">Business name</span>
                <input name="name" required className="rounded-lg border border-border px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">City</span>
                <input name="city" className="rounded-lg border border-border px-3 py-2 text-sm" />
              </label>
              {(subareas ?? []).length > 0 && (
                <label className="text-sm">
                  <span className="mb-1 block text-ink-muted">Subarea</span>
                  <select name="subarea_id" className="rounded-lg border border-border px-3 py-2 text-sm">
                    <option value="">None</option>
                    {(subareas ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button className={buttonClasses("outline")}>
                Add business
              </button>
            </form>
          )}
        </section>
      )}

      {canStaff && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Local staff</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Staff can check in Passport holders and log redemptions at
            businesses in this area. They must have already signed in once.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {((staff ?? []) as unknown as { id: string; profiles: { email: string } | null }[]).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-ink">{s.profiles?.email ?? "Unknown"}</span>
                <form action={removeStaff.bind(null, areaId, s.id)}>
                  <button className="text-xs font-semibold text-error hover:text-red-700">
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {(staff ?? []).length === 0 && (
              <li className="py-2 text-sm text-ink-muted">No staff added yet.</li>
            )}
          </ul>
          <form action={addStaff.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Staff email</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            {(businesses ?? []).length > 0 && (
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">Business (optional)</span>
                <select name="business_id" className="rounded-lg border border-border px-3 py-2 text-sm">
                  <option value="">Whole area</option>
                  {(businesses ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className={buttonClasses("outline")}>
              Add staff
            </button>
          </form>
        </section>
      )}

      {canManageUsers && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Managers &amp; franchisees</h2>
          <p className="mt-1 text-sm text-ink-muted">
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
                can_manage_leads: boolean;
                can_manage_branding: boolean;
              }[]
            ).map((m) => (
              <li key={m.id} className="rounded-lg bg-surface-elevated p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{m.profiles?.email ?? "Unknown"}</span>
                  <form action={removeAreaManager.bind(null, areaId, m.id)}>
                    <button className="text-xs font-semibold text-error hover:text-red-700">
                      Remove
                    </button>
                  </form>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {CAPABILITY_FIELDS.filter((f) => (m as unknown as Record<string, boolean>)[f.key])
                    .map((f) => f.label)
                    .join(", ") || "No capabilities granted"}
                </p>
              </li>
            ))}
            {(managers ?? []).length === 0 && (
              <li className="text-sm text-ink-muted">No managers assigned yet.</li>
            )}
          </ul>
          <form action={addAreaManager.bind(null, areaId)} className="mt-4 space-y-3">
            <input
              name="email"
              type="email"
              required
              placeholder="manager@example.com"
              className="w-full max-w-sm rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CAPABILITY_FIELDS.map((f) => {
                const allowed = canGrant(f.key);
                return (
                  <label
                    key={f.key}
                    className={`flex items-center gap-1.5 text-sm ${allowed ? "text-ink" : "text-disabled"}`}
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
            <button className={buttonClasses("primary")}>
              Assign manager
            </button>
          </form>
        </section>
      )}

      {canMarketing && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Marketing requests</h2>
          <ul className="mt-3 space-y-2">
            {(requests ?? []).map((r) => (
              <li key={r.id} className="rounded-lg bg-surface-elevated p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{r.title}</span>
                  <span className="text-xs font-semibold capitalize text-ink-muted">{r.status}</span>
                </div>
                {r.details && <p className="mt-1 text-sm text-ink-muted">{r.details}</p>}
                {r.admin_notes && (
                  <p className="mt-1 text-xs text-ink-muted">National admin note: {r.admin_notes}</p>
                )}
              </li>
            ))}
            {(requests ?? []).length === 0 && (
              <li className="text-sm text-ink-muted">No requests submitted yet.</li>
            )}
          </ul>
          <form action={createMarketingRequest.bind(null, areaId)} className="mt-4 space-y-3">
            <input
              name="title"
              required
              placeholder="Request title"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <textarea
              name="details"
              placeholder="Details"
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button className={buttonClasses("primary")}>
              Submit request
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
