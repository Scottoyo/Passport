import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";
import type { PassportArea, PassportProduct, Profile } from "@/lib/types/domain";
import { updateMyPassportDates, uploadMyPassportPhoto } from "../actions";
import { SharePassportButton } from "@/components/share-passport-button";

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default async function MyPassportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/passport");

  const [passports, { data: profile }] = await Promise.all([
    getMyPassports(user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
  ]);

  if (passports.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600">You don&apos;t have a Passport yet.</p>
        <Link
          href="/passport"
          className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Get Your Passport
        </Link>
      </div>
    );
  }

  const areaIds = [...new Set(passports.map((p) => p.passport_area_id))];
  const productIds = [...new Set(passports.map((p) => p.passport_product_id))];
  const [{ data: areas }, { data: products }] = await Promise.all([
    supabase.from("passport_areas").select("*").in("id", areaIds).returns<PassportArea[]>(),
    supabase.from("passport_products").select("*").in("id", productIds).returns<PassportProduct[]>(),
  ]);
  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const { data: states } = await supabase
    .from("states")
    .select("id, slug")
    .in(
      "id",
      [...new Set((areas ?? []).map((a) => a.state_id))]
    );
  const stateSlugById = new Map((states ?? []).map((s) => [s.id as string, s.slug as string]));

  const primary = passports[0];
  const primaryArea = areaById.get(primary.passport_area_id);
  const primaryStateSlug = primaryArea ? stateSlugById.get(primaryArea.state_id) : null;
  const referralPath =
    primaryArea && primaryStateSlug
      ? `/${primaryStateSlug}/${primaryArea.slug}/passport${profile?.referral_code ? `?ref=${profile.referral_code}` : ""}`
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">My Digital Passport</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 p-6">
          {primary.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary.photo_url}
              alt="Your Passport photo"
              className="mb-4 h-48 w-full rounded-xl object-cover"
            />
          )}
          <form action={uploadMyPassportPhoto.bind(null, primary.id)} className="flex items-center gap-2">
            <input type="file" name="photo" accept="image/*" required className="text-sm" />
            <button className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
              {primary.photo_url ? "Replace Photo" : "Upload Photo"}
            </button>
          </form>

          {referralPath && (
            <div className="mt-4">
              <SharePassportButton path={referralPath} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Passport Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Product</dt>
              <dd className="text-slate-900">{productById.get(primary.passport_product_id)?.name ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-900 capitalize">{primary.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Passport holder</dt>
              <dd className="text-slate-900">{profile?.full_name || user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Passport number</dt>
              <dd className="text-slate-900">{primary.passport_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Purchased</dt>
              <dd className="text-slate-900">{new Date(primary.purchased_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Expires</dt>
              <dd className="text-slate-900">{new Date(primary.expires_at).toLocaleDateString()}</dd>
            </div>
          </dl>

          <form
            action={updateMyPassportDates.bind(null, primary.id)}
            className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          >
            <p className="text-sm font-medium text-slate-900">Vacation dates</p>
            <p className="text-xs text-slate-500">
              Let us know when you&apos;ll be visiting so we can personalize your Passport experience.
            </p>
            <div className="flex gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Start date</span>
                <input
                  type="date"
                  name="travel_start_date"
                  defaultValue={toDateInputValue(primary.travel_start_date)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">End date</span>
                <input
                  type="date"
                  name="travel_end_date"
                  defaultValue={toDateInputValue(primary.travel_end_date)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Save Vacation Dates
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">How to use</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-500">
              <li>Browse businesses and view their active Passport offer.</li>
              <li>Open a business and click Redeem when you&apos;re there in person.</li>
              <li>Hand your device to staff - they enter their business&apos;s private code.</li>
              <li>
                Only participating business staff should enter that code. Passport holders should never be given
                or enter a business&apos;s private redemption code.
              </li>
            </ol>
          </div>

          {primaryArea && primaryStateSlug && (
            <Link
              href={`/${primaryStateSlug}/${primaryArea.slug}`}
              className="mt-4 block rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:border-slate-500"
            >
              Explore Available Promotions
            </Link>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Passport History</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {passports.map((p, i) => {
            const area = areaById.get(p.passport_area_id);
            const product = productById.get(p.passport_product_id);
            return (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">Term {passports.length - i}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {product?.name ?? "Passport"} &middot; {area?.name ?? "Unknown region"} &middot;{" "}
                    {new Date(p.purchased_at).toLocaleDateString()} &ndash;{" "}
                    {new Date(p.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {product ? `$${(product.price_cents / 100).toFixed(2)}` : "-"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
