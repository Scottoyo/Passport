import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { getCategories } from "@/lib/queries";
import type { Business, BusinessHoursDay } from "@/lib/types/domain";
import {
  updateBusinessBasicInfo,
  updateBusinessLocationContact,
  updateBusinessSocialLinks,
  updateBusinessHours,
  uploadBusinessLogo,
  uploadBusinessCover,
  addBusinessGalleryImage,
  removeBusinessGalleryImage,
} from "@/app/admin/areas/[areaId]/businesses/[businessId]/actions";
import { buttonClasses } from "@/lib/ui-classes";

interface Props {
  params: Promise<{ businessId: string }>;
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

export default async function PortalProfilePage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  const { data: area } = await supabase
    .from("passport_areas")
    .select("state_id")
    .eq("id", business.passport_area_id)
    .maybeSingle();
  const categories = area ? await getCategories([area.state_id]) : [];
  const areaId = business.passport_area_id;
  const hoursByDay = new Map((business.business_hours ?? []).map((h) => [h.day, h]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Profile</h2>
        <p className="mt-1 text-ink-muted">
          Update and manage your business information displayed on the passport portal.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Basic information</h3>
        <form action={updateBusinessBasicInfo.bind(null, areaId, businessId)} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Business name</span>
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
              {categories.map((c) => (
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
            <span className="mb-1 block text-ink-muted">Full description</span>
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

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Address &amp; contact</h3>
        <form action={updateBusinessLocationContact.bind(null, areaId, businessId)} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-muted">Street address</span>
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
                placeholder="Suite, unit, or building"
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
              <span className="mb-1 block text-ink-muted">State</span>
              <input
                name="state_code"
                defaultValue={business.state_code ?? ""}
                maxLength={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">ZIP code</span>
              <input
                name="postal_code"
                defaultValue={business.postal_code ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Phone number</span>
              <input
                name="phone"
                defaultValue={business.phone ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Email address</span>
              <input
                name="email"
                type="email"
                defaultValue={business.email ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-muted">Website URL</span>
              <input
                name="website_url"
                defaultValue={business.website_url ?? ""}
                placeholder="example.com"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button className={buttonClasses("primary")}>
            Save
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Social links</h3>
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

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Business hours</h3>
        <p className="mt-1 text-sm text-ink-muted">Set your opening and closing times for each day of the week.</p>
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
              <input type="checkbox" name="weather_permitting" defaultChecked={business.weather_permitting} />
              Weather permitting
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="call_for_appointment" defaultChecked={business.call_for_appointment} />
              Call for appointment
            </label>
          </div>
          <button className={buttonClasses("primary")}>
            Save hours
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-ink">Business media</h3>
        <p className="mt-1 text-sm text-ink-muted">Manage your business logo, cover image, and photo gallery.</p>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Business logo</p>
            {business.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="Logo" className="mb-2 h-20 w-20 rounded-lg object-cover" />
            )}
            <form action={uploadBusinessLogo.bind(null, areaId, businessId)} className="flex items-center gap-2">
              <input type="file" name="logo" accept="image/*" required className="text-sm" />
              <button className={buttonClasses("outline", "sm")}>
                Upload
              </button>
            </form>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Cover image</p>
            {business.hero_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.hero_image_url} alt="Cover" className="mb-2 h-20 w-32 rounded-lg object-cover" />
            )}
            <form action={uploadBusinessCover.bind(null, areaId, businessId)} className="flex items-center gap-2">
              <input type="file" name="cover" accept="image/*" required className="text-sm" />
              <button className={buttonClasses("outline", "sm")}>
                Upload
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink">Gallery images</p>
          <div className="flex flex-wrap gap-3">
            {business.gallery_image_urls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Gallery" className="h-20 w-20 rounded-lg object-cover" />
                <form action={removeBusinessGalleryImage.bind(null, areaId, businessId, url)}>
                  <button className="absolute -right-1 -top-1 rounded-full bg-error px-1.5 text-xs font-bold text-white">
                    &times;
                  </button>
                </form>
              </div>
            ))}
            {business.gallery_image_urls.length === 0 && (
              <p className="text-sm text-ink-muted">No gallery images added yet.</p>
            )}
          </div>
          <form
            action={addBusinessGalleryImage.bind(null, areaId, businessId)}
            className="mt-3 flex items-center gap-2"
          >
            <input type="file" name="gallery" accept="image/*" required className="text-sm" />
            <button className={buttonClasses("outline", "sm")}>
              Add images
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
