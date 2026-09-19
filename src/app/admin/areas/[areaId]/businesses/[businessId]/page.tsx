import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canManageArea } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import type { Business, BusinessApprovalStatus, BusinessHoursDay, Offer, PassportArea, State } from "@/lib/types/domain";
import { StatusBadge } from "@/components/status-badge";
import { OfferForm } from "@/components/business/offer-form";
import { addStaff, removeStaff } from "../../actions";
import { setBusinessApproval, setBusinessFeatured } from "../../../../businesses/actions";
import {
  setBusinessActiveStatus,
  updateBusinessBasicInfo,
  updateBusinessLocationContact,
  updateBusinessSocialLinks,
  updateBusinessHours,
  uploadBusinessLogo,
  uploadBusinessCover,
  addBusinessGalleryImage,
  removeBusinessGalleryImage,
  regenerateRedemptionCode,
  createOffer,
  updateOffer,
  setOfferStatus,
} from "./actions";

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

  const [{ data: offers }, categoryList, { data: staff }, { data: owner }] = await Promise.all([
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
            <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
            <StatusBadge status={business.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[business.city, area.name].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={modeHref("view")}
            className={
              mode === "view"
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
            }
          >
            View
          </Link>
          {(canBusinesses || canOffers || canStaff) && (
            <Link
              href={modeHref("edit")}
              className={
                mode === "edit"
                  ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
              }
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {canBusinesses && (
        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Status</h2>
          <p className="mt-1 text-sm text-slate-500">
            Visible only to region managers, state managers, and national admins.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active status</p>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Approval status</p>
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
                    <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      Approve anyway
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Featured listing</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-slate-700">{business.featured ? "Featured" : "Not featured"}</span>
                {business.approval_status === "approved" && (
                  <form action={setBusinessFeatured.bind(null, businessId, !business.featured)}>
                    <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      {business.featured ? "Unfeature" : "Feature"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {mode === "view" ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Basic information</h2>
            <dl className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="text-slate-900">
                  {categoryList.find((c) => c.id === business.category_id)?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Slug</dt>
                <dd className="text-slate-900">{business.slug}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Short description</dt>
                <dd className="text-slate-900">{business.short_description || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Description</dt>
                <dd className="whitespace-pre-wrap text-slate-900">{business.description || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Location &amp; contact</h2>
            <dl className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="text-slate-900">
                  {[business.address_line1, business.address_line2, business.city, business.state_code, business.postal_code]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-900">{business.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-900">{business.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Website</dt>
                <dd className="text-slate-900">{business.website_url || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Social links</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {SOCIAL_FIELDS.map((f) => (
                <li key={f.key} className="flex gap-2">
                  <span className="w-24 text-slate-500">{f.label}</span>
                  <span className="text-slate-900">{(business[f.key] as string | null) || "—"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Business hours</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {DAY_ORDER.map((day) => {
                const h = hoursByDay.get(day);
                return (
                  <li key={day} className="flex gap-2">
                    <span className="w-24 text-slate-500">{DAY_LABELS[day]}</span>
                    <span className="text-slate-900">
                      {h?.is_open ? `${h.opens_at ?? "?"} – ${h.closes_at ?? "?"}` : "Closed"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-slate-500">
              {business.weather_permitting && "Weather permitting. "}
              {business.call_for_appointment && "By appointment only."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Media</h2>
            <div className="mt-3 flex flex-wrap gap-4">
              {business.logo_url && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">Logo</p>
                  <img src={business.logo_url} alt="Logo" className="h-20 w-20 rounded-lg object-cover" />
                </div>
              )}
              {business.hero_image_url && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">Cover</p>
                  <img src={business.hero_image_url} alt="Cover" className="h-20 w-32 rounded-lg object-cover" />
                </div>
              )}
              {business.gallery_image_urls.map((url) => (
                <div key={url}>
                  <p className="mb-1 text-xs text-slate-500">Gallery</p>
                  <img src={url} alt="Gallery" className="h-20 w-20 rounded-lg object-cover" />
                </div>
              ))}
              {!business.logo_url && !business.hero_image_url && business.gallery_image_urls.length === 0 && (
                <p className="text-sm text-slate-500">No media uploaded yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {canBusinesses && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Basic information</h2>
              <form action={updateBusinessBasicInfo.bind(null, areaId, businessId)} className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Name</span>
                  <input
                    name="name"
                    defaultValue={business.name}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Category</span>
                  <select
                    name="category_id"
                    defaultValue={business.category_id ?? ""}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                  <span className="mb-1 block text-slate-600">Short description</span>
                  <input
                    name="short_description"
                    defaultValue={business.short_description ?? ""}
                    placeholder="One line for cards and search results"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Description</span>
                  <textarea
                    name="description"
                    defaultValue={business.description ?? ""}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Location &amp; contact</h2>
              <form
                action={updateBusinessLocationContact.bind(null, areaId, businessId)}
                className="mt-4 space-y-3"
              >
                {reassignAreas.length > 0 && (
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Region</span>
                    <select
                      name="area_id"
                      defaultValue={areaId}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {reassignAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {a.stateName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Address line 1</span>
                    <input
                      name="address_line1"
                      defaultValue={business.address_line1 ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Address line 2</span>
                    <input
                      name="address_line2"
                      defaultValue={business.address_line2 ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">City</span>
                    <input
                      name="city"
                      defaultValue={business.city ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">State code</span>
                    <input
                      name="state_code"
                      defaultValue={business.state_code ?? ""}
                      maxLength={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Postal code</span>
                    <input
                      name="postal_code"
                      defaultValue={business.postal_code ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Phone</span>
                    <input
                      name="phone"
                      defaultValue={business.phone ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Email</span>
                    <input
                      name="email"
                      type="email"
                      defaultValue={business.email ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block text-slate-600">Website</span>
                    <input
                      name="website_url"
                      defaultValue={business.website_url ?? ""}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Social links</h2>
              <form action={updateBusinessSocialLinks.bind(null, areaId, businessId)} className="mt-4 space-y-3">
                {SOCIAL_FIELDS.map((f) => (
                  <label key={f.key} className="block text-sm">
                    <span className="mb-1 block text-slate-600">{f.label}</span>
                    <input
                      name={f.key}
                      defaultValue={(business[f.key] as string | null) ?? ""}
                      placeholder="https://"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Business hours</h2>
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
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="time"
                        name={`closes_at_${day}`}
                        defaultValue={h?.closes_at ?? ""}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3">
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
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Save
                </button>
              </form>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Media</h2>

              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Logo</p>
                  {business.logo_url && (
                    <img src={business.logo_url} alt="Logo" className="mb-2 h-20 w-20 rounded-lg object-cover" />
                  )}
                  <form action={uploadBusinessLogo.bind(null, areaId, businessId)} className="flex items-center gap-2">
                    <input type="file" name="logo" accept="image/*" required className="text-sm" />
                    <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      Upload
                    </button>
                  </form>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Cover image</p>
                  {business.hero_image_url && (
                    <img
                      src={business.hero_image_url}
                      alt="Cover"
                      className="mb-2 h-20 w-32 rounded-lg object-cover"
                    />
                  )}
                  <form
                    action={uploadBusinessCover.bind(null, areaId, businessId)}
                    className="flex items-center gap-2"
                  >
                    <input type="file" name="cover" accept="image/*" required className="text-sm" />
                    <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      Upload
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-slate-700">Gallery</p>
                <div className="flex flex-wrap gap-3">
                  {business.gallery_image_urls.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="Gallery" className="h-20 w-20 rounded-lg object-cover" />
                      <form action={removeBusinessGalleryImage.bind(null, areaId, businessId, url)}>
                        <button className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                          &times;
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
                <form
                  action={addBusinessGalleryImage.bind(null, areaId, businessId)}
                  className="mt-3 flex items-center gap-2"
                >
                  <input type="file" name="gallery" accept="image/*" required className="text-sm" />
                  <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
                    Add to gallery
                  </button>
                </form>
              </div>
            </section>
          )}

          {canBusinesses && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Redemption code</h2>
              <p className="mt-1 text-sm text-slate-500">
                Staff use this code to authorize a redemption in person. There&apos;s no scan/verify
                screen yet — this just generates and displays the code.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Code</dt>
                  <dd className="font-mono text-lg text-slate-900">{business.redemption_code ?? "Not generated"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last updated</dt>
                  <dd className="text-slate-900">
                    {business.redemption_code_updated_at
                      ? new Date(business.redemption_code_updated_at).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Failed attempts</dt>
                  <dd className="text-slate-900">{business.redemption_failed_attempts}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Locked</dt>
                  <dd className="text-slate-900">{business.redemption_locked_at ? "Yes" : "No"}</dd>
                </div>
              </dl>
              <form action={regenerateRedemptionCode.bind(null, areaId, businessId)} className="mt-4">
                <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
                  {business.redemption_code ? "Regenerate code" : "Generate code"}
                </button>
              </form>
            </section>
          )}

          {canStaff && (
            <section className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900">Business users</h2>
              <p className="mt-1 text-sm text-slate-500">
                Owner: {(owner as { email: string; full_name: string | null } | null)?.full_name ||
                  (owner as { email: string } | null)?.email ||
                  "Unknown"}
              </p>
              <ul className="mt-3 divide-y divide-slate-100">
                {((staff ?? []) as unknown as { id: string; profiles: { email: string } | null }[]).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-800">{s.profiles?.email ?? "Unknown"}</span>
                    <form action={removeStaff.bind(null, areaId, s.id)}>
                      <button className="text-xs font-semibold text-red-600 hover:text-red-700">Remove</button>
                    </form>
                  </li>
                ))}
                {(staff ?? []).length === 0 && (
                  <li className="py-2 text-sm text-slate-500">No staff added yet.</li>
                )}
              </ul>
              <form action={addStaff.bind(null, areaId)} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="business_id" value={businessId} />
                <label className="text-sm">
                  <span className="mb-1 block text-slate-600">Staff email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
                  Add staff
                </button>
              </form>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Offers</h2>
            <ul className="mt-3 space-y-3">
              {(offers ?? []).map((offer) => (
                <li key={offer.id} className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{offer.title}</span>
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
                  {offer.description && <p className="mt-1 text-sm text-slate-600">{offer.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {offer.redemptions_per_passport === null
                      ? "Unlimited redemptions per Passport"
                      : `${offer.redemptions_per_passport} redemption${offer.redemptions_per_passport === 1 ? "" : "s"} per Passport`}
                  </p>
                  {offer.redemption_instructions && (
                    <p className="mt-1 text-xs text-slate-500">Instructions: {offer.redemption_instructions}</p>
                  )}
                  {canOffers && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                        Edit
                      </summary>
                      <div className="mt-3 border-t border-slate-200 pt-3">
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
              {(offers ?? []).length === 0 && <li className="text-sm text-slate-500">No offers yet.</li>}
            </ul>

            {canOffers && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <OfferForm action={createOffer.bind(null, areaId, businessId)} submitLabel="Add offer" />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
