import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getBusinessMedia } from "@/lib/queries";
import type { Business, BusinessApprovalStatus, BusinessHoursDay, Offer, PassportArea, State } from "@/lib/types/domain";
import { StatusBadge } from "@/components/status-badge";
import { buttonClasses } from "@/lib/ui-classes";
import { OfferForm } from "@/components/business/offer-form";
import { BusinessMediaEditor } from "@/components/business/media-editor";
import { addStaff, removeStaff } from "../../actions";
import { setBusinessApproval, featureBusiness, unfeatureBusiness } from "../../../../businesses/actions";
import { featuredStatusLabel } from "@/lib/business-featured";
import {
  setBusinessActiveStatus,
  updateBusinessBasicInfo,
  updateBusinessLocationContact,
  updateBusinessSocialLinks,
  updateBusinessHours,
  uploadBusinessLogo,
  uploadBusinessCover,
  clearBusinessLogo,
  clearBusinessCover,
  addBusinessGalleryImage,
  removeBusinessGalleryImage,
  updateBusinessGalleryImageAlt,
  reorderBusinessGalleryImages,
  regenerateRedemptionCode,
  createOffer,
  updateOffer,
  setOfferStatus,
} from "./actions";

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

interface Props {
  params: Promise<{ areaId: string; businessId: string }>;
  searchParams: Promise<{ mode?: string }>;
}

const DAY_LABELS: Record<string, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};
const DAY_ORDER: BusinessHoursDay["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SOCIAL_FIELDS: { key: keyof Business; label: string }[] = [
  { key: "facebook_url", label: "Facebook" },
  { key: "instagram_url", label: "Instagram" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "youtube_url", label: "YouTube" },
  { key: "twitter_url", label: "X / Twitter" },
  { key: "linkedin_url", label: "LinkedIn" },
];

export default async function BusinessAdminPage({ params, searchParams }: Props) {
  const { areaId, businessId } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = modeParam === "edit" ? "edit" : "view";

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const supabase = await createClient();
  const { data: area } = await supabase
    .from("passport_areas")
    .select("*")
    .eq("id", areaId)
    .maybeSingle<PassportArea>();
  if (!area) notFound();

  const canOffers = canManageArea(currentUser, areaId, "manage_offers", area.state_id);
  const canView = canManageArea(currentUser, areaId, "view_metrics", area.state_id);
  const canBusinesses = canManageArea(currentUser, areaId, "manage_businesses", area.state_id);
  const canStaff = canManageArea(currentUser, areaId, "manage_staff", area.state_id);
  if (!canOffers && !canView && !canBusinesses && !canStaff) redirect("/admin");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("passport_area_id", areaId)
    .maybeSingle<Business>();
  if (!business) notFound();

  const [{ data: offers }, categoryList, { data: staff }, { data: owner }, media] = await Promise.all([
    supabase
      .from("offers")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .returns<Offer[]>(),
    getCategories([area.state_id]),
    canStaff
      ? supabase
          .from("local_staff")
          .select("id, profiles:user_id(email)")
          .eq("business_id", businessId)
      : Promise.resolve({ data: null }),
    business.created_by
      ? supabase.from("profiles").select("email, full_name").eq("id", business.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    getBusinessMedia(businessId),
  ]);

  let reassignAreas: (PassportArea & { stateName: string })[] = [];
  if (canBusinesses) {
    const [{ data: allAreas }, { data: allStates }] = await Promise.all([
      supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
      supabase.from("states").select("*").returns<State[]>(),
    ]);
    const stateNameById = new Map((allStates ?? []).map((s) => [s.id, s.name]));
    reassignAreas = (allAreas ?? [])
      .filter((a) => canManageArea(currentUser, a.id, "manage_businesses", a.state_id))
      .map((a) => ({ ...a, stateName: stateNameById.get(a.state_id) ?? "Unknown state" }));
  }

  const hoursByDay = new Map((business.business_hours ?? []).map((h) => [h.day, h]));
  const modeHref = (m: "view" | "edit") => `/admin/areas/${areaId}/businesses/${businessId}?mode=${m}`;

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{business.name}</h1>
            <StatusBadge status={business.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {[business.city, area.name].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={modeHref("view")}
            className={
              mode === "view"
                ? buttonClasses("primary", "sm")
                : buttonClasses("outline", "sm")
            }
          >
            View
          </Link>
          {(canBusinesses || canOffers || canStaff) && (
            <Link
              href={modeHref("edit")}
              className={
                mode === "edit"
                  ? buttonClasses("primary", "sm")
                  : buttonClasses("outline", "sm")
              }
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {canBusinesses && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Status</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Visible only to region managers, state managers, and national admins.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Active status</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={business.status} />
                {business.status === "active" ? (
                  <form action={setBusinessActiveStatus.bind(null, areaId, businessId, false)}>
                    <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400">
                      Pause
                    </button>
                  </form>
                ) : (
                  <form action={setBusinessActiveStatus.bind(null, areaId, businessId, true)}>
                    <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                      Launch
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Approval status</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[business.approval_status]}`}
                >
                  {APPROVAL_LABELS[business.approval_status]}
                </span>
                {business.approval_status === "pending_review" && (
                  <>
                    <form action={setBusinessApproval.bind(null, businessId, "approved")}>
                      <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                        Approve
                      </button>
                    </form>
                    <form action={setBusinessApproval.bind(null, businessId, "rejected")}>
                      <button className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">
                        Reject
                      </button>
                    </form>
                  </>
                )}
                {business.approval_status === "rejected" && (
                  <form action={setBusinessApproval.bind(null, businessId, "approved")}>
                    <button className={buttonClasses("outline", "sm")}>
                      Approve anyway
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Featured listing</p>
              <p className="mt-1 text-sm text-ink">{featuredStatusLabel(business)}</p>
              {business.approval_status === "approved" && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {business.featured ? (
                    <form action={unfeatureBusiness.bind(null, businessId)}>
                      <button className={buttonClasses("outline", "sm")}>Unfeature</button>
                    </form>
                  ) : (
                    <>
                      <form action={featureBusiness.bind(null, businessId)}>
                        <input type="hidden" name="preset" value="7" />
                        <button className={buttonClasses("outline", "sm")}>Feature for 7 days</button>
                      </form>
                      <form action={featureBusiness.bind(null, businessId)}>
                        <input type="hidden" name="preset" value="30" />
                        <button className={buttonClasses("outline", "sm")}>Feature for 30 days</button>
                      </form>
                      <form action={featureBusiness.bind(null, businessId)} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="preset" value="custom" />
                        <label className="text-xs">
                          <span className="mb-1 block text-ink-muted">Start</span>
                          <input
                            type="date"
                            name="starts_at"
                            required
                            className="rounded-lg border border-border px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block text-ink-muted">End</span>
                          <input
                            type="date"
                            name="ends_at"
                            required
                            className="rounded-lg border border-border px-2 py-1 text-sm"
                          />
                        </label>
                        <button className={buttonClasses("outline", "sm")}>Feature (custom)</button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {mode === "view" ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-ink">Basic information</h2>
            <dl className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Category</dt>
                <dd className="text-ink">
                  {categoryList.find((c) => c.id === business.category_id)?.name ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Slug</dt>
                <dd className="text-ink">{business.slug}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Short description</dt>
                <dd className="text-ink">{business.short_description || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Description</dt>
                <dd className="whitespace-pre-wrap text-ink">{business.description || "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-ink">Location &amp; contact</h2>
            <dl className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Address</dt>
                <dd className="text-ink">
                  {[business.address_line1, business.address_line2, business.city, business.state_code, business.postal_code]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Phone</dt>
                <dd className="text-ink">{business.phone || "-"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Email</dt>
                <dd className="text-ink">{business.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Website</dt>
                <dd className="text-ink">{business.website_url || "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-ink">Social links</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {SOCIAL_FIELDS.map((f) => (
                <li key={f.key} className="flex gap-2">
                  <span className="w-24 text-ink-muted">{f.label}</span>
                  <span className="text-ink">{(business[f.key] as string | null) || "-"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-ink">Business hours</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {DAY_ORDER.map((day) => {
                const h = hoursByDay.get(day);
                return (
                  <li key={day} className="flex gap-2">
                    <span className="w-24 text-ink-muted">{DAY_LABELS[day]}</span>
                    <span className="text-ink">
                      {h?.is_open ? `${h.opens_at ?? "?"} – ${h.closes_at ?? "?"}` : "Closed"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-ink-muted">
              {business.weather_permitting && "Weather permitting. "}
              {business.call_for_appointment && "By appointment only."}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-ink">Media</h2>
            <div className="mt-3 flex flex-wrap gap-4">
              {business.logo_url && (
                <div>
                  <p className="mb-1 text-xs text-ink-muted">Logo</p>
                  <img src={business.logo_url} alt="Logo" className="h-20 w-20 rounded-lg object-cover" />
                </div>
              )}
              {business.hero_image_url && (
                <div>
                  <p className="mb-1 text-xs text-ink-muted">Cover</p>
                  <img src={business.hero_image_url} alt="Cover" className="h-20 w-32 rounded-lg object-cover" />
                </div>
              )}
              {media.map((item) => (
                <div key={item.id}>
                  <p className="mb-1 text-xs text-ink-muted">Gallery</p>
                  <img src={item.url} alt={item.alt_text ?? "Gallery"} className="h-20 w-20 rounded-lg object-cover" />
                </div>
              ))}
              {!business.logo_url && !business.hero_image_url && media.length === 0 && (
                <p className="text-sm text-ink-muted">No media uploaded yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {canBusinesses && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Basic information</h2>
              <form action={updateBusinessBasicInfo.bind(null, areaId, businessId)} className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-muted">Name</span>
                  <input
                    name="name"
                    defaultValue={business.name}
                    required
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-muted">Category</span>
                  <select
                    name="category_id"
                    defaultValue={business.category_id ?? ""}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <option value="">None</option>
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-muted">Short description</span>
                  <input
                    name="short_description"
                    defaultValue={business.short_description ?? ""}
                    placeholder="One line for cards and search results"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-ink-muted">Description</span>
                  <textarea
                    name="description"
                    defaultValue={business.description ?? ""}
                    rows={4}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
                <button className={buttonClasses("primary")}>
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Location &amp; contact</h2>
              <form
                action={updateBusinessLocationContact.bind(null, areaId, businessId)}
                className="mt-4 space-y-3"
              >
                {reassignAreas.length > 0 && (
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-muted">Region</span>
                    <select
                      name="area_id"
                      defaultValue={areaId}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      {reassignAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} - {a.stateName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-ink-muted">Address line 1</span>
                    <input
                      name="address_line1"
                      defaultValue={business.address_line1 ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-ink-muted">Address line 2</span>
                    <input
                      name="address_line2"
                      defaultValue={business.address_line2 ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-muted">City</span>
                    <input
                      name="city"
                      defaultValue={business.city ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-muted">State code</span>
                    <input
                      name="state_code"
                      defaultValue={business.state_code ?? ""}
                      maxLength={2}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-muted">Postal code</span>
                    <input
                      name="postal_code"
                      defaultValue={business.postal_code ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-muted">Phone</span>
                    <input
                      name="phone"
                      defaultValue={business.phone ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-ink-muted">Email</span>
                    <input
                      name="email"
                      type="email"
                      defaultValue={business.email ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-ink-muted">Website</span>
                    <input
                      name="website_url"
                      defaultValue={business.website_url ?? ""}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button className={buttonClasses("primary")}>
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Social links</h2>
              <form action={updateBusinessSocialLinks.bind(null, areaId, businessId)} className="mt-4 space-y-3">
                {SOCIAL_FIELDS.map((f) => (
                  <label key={f.key} className="block text-sm">
                    <span className="mb-1 block text-ink-muted">{f.label}</span>
                    <input
                      name={f.key}
                      defaultValue={(business[f.key] as string | null) ?? ""}
                      placeholder="https://"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <button className={buttonClasses("primary")}>
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Business hours</h2>
              <form action={updateBusinessHours.bind(null, areaId, businessId)} className="mt-4 space-y-3">
                {DAY_ORDER.map((day) => {
                  const h = hoursByDay.get(day);
                  return (
                    <div key={day} className="flex flex-wrap items-center gap-3">
                      <label className="flex w-32 items-center gap-2 text-sm">
                        <input type="checkbox" name={`is_open_${day}`} defaultChecked={h?.is_open ?? false} />
                        {DAY_LABELS[day]}
                      </label>
                      <input
                        type="time"
                        name={`opens_at_${day}`}
                        defaultValue={h?.opens_at ?? ""}
                        className="rounded-lg border border-border px-2 py-1 text-sm"
                      />
                      <span className="text-ink-muted">to</span>
                      <input
                        type="time"
                        name={`closes_at_${day}`}
                        defaultValue={h?.closes_at ?? ""}
                        className="rounded-lg border border-border px-2 py-1 text-sm"
                      />
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-4 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="weather_permitting"
                      defaultChecked={business.weather_permitting}
                    />
                    Weather permitting
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="call_for_appointment"
                      defaultChecked={business.call_for_appointment}
                    />
                    By appointment only
                  </label>
                </div>
                <button className={buttonClasses("primary")}>
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Business Images and Media</h2>
              <div className="mt-4">
                <BusinessMediaEditor
                  logoUrl={business.logo_url}
                  coverUrl={business.hero_image_url}
                  media={media}
                  uploadLogo={uploadBusinessLogo.bind(null, areaId, businessId)}
                  uploadCover={uploadBusinessCover.bind(null, areaId, businessId)}
                  clearLogo={clearBusinessLogo.bind(null, areaId, businessId)}
                  clearCover={clearBusinessCover.bind(null, areaId, businessId)}
                  addGalleryImage={addBusinessGalleryImage.bind(null, areaId, businessId)}
                  removeGalleryImage={removeBusinessGalleryImage.bind(null, areaId, businessId)}
                  updateGalleryImageAlt={updateBusinessGalleryImageAlt.bind(null, areaId, businessId)}
                  reorderGalleryImages={reorderBusinessGalleryImages.bind(null, areaId, businessId)}
                />
              </div>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Redemption code</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Staff use this code to authorize a redemption in person. There&apos;s no scan/verify
                screen yet - this just generates and displays the code.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-ink-muted">Code</dt>
                  <dd className="font-mono text-lg text-ink">{business.redemption_code ?? "Not generated"}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Last updated</dt>
                  <dd className="text-ink">
                    {business.redemption_code_updated_at
                      ? new Date(business.redemption_code_updated_at).toLocaleString()
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Failed attempts</dt>
                  <dd className="text-ink">{business.redemption_failed_attempts}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Locked</dt>
                  <dd className="text-ink">{business.redemption_locked_at ? "Yes" : "No"}</dd>
                </div>
              </dl>
              <form action={regenerateRedemptionCode.bind(null, areaId, businessId)} className="mt-4">
                <button className={buttonClasses("outline")}>
                  {business.redemption_code ? "Regenerate code" : "Generate code"}
                </button>
              </form>
            </section>
          )}

          {canStaff && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-ink">Business users</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Owner: {(owner as { email: string; full_name: string | null } | null)?.full_name ||
                  (owner as { email: string } | null)?.email ||
                  "Unknown"}
              </p>
              <ul className="mt-3 divide-y divide-border">
                {((staff ?? []) as unknown as { id: string; profiles: { email: string } | null }[]).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-ink">{s.profiles?.email ?? "Unknown"}</span>
                    <form action={removeStaff.bind(null, areaId, s.id)}>
                      <button className="text-xs font-semibold text-error hover:text-red-700">Remove</button>
                    </form>
                  </li>
                ))}
                {(staff ?? []).length === 0 && (
                  <li className="py-2 text-sm text-ink-muted">No staff added yet.</li>
                )}
              </ul>
              <form action={addStaff.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="business_id" value={businessId} />
                <label className="text-sm">
                  <span className="mb-1 block text-ink-muted">Staff email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
                <button className={buttonClasses("outline")}>
                  Add staff
                </button>
              </form>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold text-ink">Offers</h2>
            <ul className="mt-3 space-y-3">
              {(offers ?? []).map((offer) => (
                <li key={offer.id} className="rounded-lg bg-surface-elevated p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{offer.title}</span>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={offer.status} />
                      {canOffers &&
                        (offer.status !== "active" ? (
                          <form action={setOfferStatus.bind(null, areaId, businessId, offer.id, "active")}>
                            <button className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500">
                              Launch
                            </button>
                          </form>
                        ) : (
                          <form action={setOfferStatus.bind(null, areaId, businessId, offer.id, "paused")}>
                            <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400">
                              Pause
                            </button>
                          </form>
                        ))}
                    </div>
                  </div>
                  {offer.description && <p className="mt-1 text-sm text-ink-muted">{offer.description}</p>}
                  <p className="mt-1 text-xs text-ink-muted">
                    {offer.redemptions_per_passport === null
                      ? "Unlimited redemptions per Passport"
                      : `${offer.redemptions_per_passport} redemption${offer.redemptions_per_passport === 1 ? "" : "s"} per Passport`}
                  </p>
                  {offer.redemption_instructions && (
                    <p className="mt-1 text-xs text-ink-muted">Instructions: {offer.redemption_instructions}</p>
                  )}
                  {canOffers && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">
                        Edit
                      </summary>
                      <div className="mt-3 border-t border-border pt-3">
                        <OfferForm
                          offer={offer}
                          action={updateOffer.bind(null, areaId, businessId, offer.id)}
                          submitLabel="Save changes"
                        />
                      </div>
                    </details>
                  )}
                </li>
              ))}
              {(offers ?? []).length === 0 && <li className="text-sm text-ink-muted">No offers yet.</li>}
            </ul>

            {canOffers && (
              <div className="mt-6 border-t border-border pt-4">
                <OfferForm action={createOffer.bind(null, areaId, businessId)} submitLabel="Add offer" />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
