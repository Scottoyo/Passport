import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { getAllStatesForAdmin } from "@/lib/admin-scope";
import { createClient } from "@/lib/supabase/server";
import {
  getHolderProfile,
  getPassportsForHolder,
  getRedemptionsForPassports,
  getFavoriteBusinessesForHolder,
  getAllPassportProducts,
} from "@/lib/admin-queries";
import { formatPassportNumber } from "@/lib/format";
import type { PassportStatus, State, PassportProduct } from "@/lib/types/domain";
import {
  updateHolderProfile,
  updatePassportStatus,
  updatePassportExpiry,
  updatePassportTravelDates,
  reassignPassportState,
  suspendHolder,
  reactivateHolder,
  softDeleteHolder,
  restoreHolder,
  sendHolderPasswordReset,
} from "./actions";

const STATUS_OPTIONS: PassportStatus[] = ["active", "expired", "revoked"];
const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const cardClass = "mt-6 rounded-2xl border border-slate-200 p-6";
const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default async function PassportHolderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ mode?: string; confirm?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/passport-holders");
  if (
    !currentUser.isNationalAdmin &&
    currentUser.stateAssignments.length === 0 &&
    currentUser.areaAssignments.length === 0
  ) {
    redirect("/admin");
  }

  const { profileId } = await params;
  const { mode, confirm } = await searchParams;
  const editing = mode === "edit";
  const baseHref = `/admin/passport-holders/${profileId}`;

  const holder = await getHolderProfile(profileId);
  if (!holder) notFound();

  const passports = await getPassportsForHolder(profileId);
  const passportIds = passports.map((p) => p.id);
  const [redemptions, favorites] = await Promise.all([
    getRedemptionsForPassports(passportIds),
    getFavoriteBusinessesForHolder(profileId),
  ]);

  let productsByState: { state: State; products: PassportProduct[] }[] = [];
  let areaNameById = new Map<string, string>();
  if (currentUser.isNationalAdmin) {
    const supabase = await createClient();
    const [allProducts, allStates, { data: allAreas }] = await Promise.all([
      getAllPassportProducts(),
      getAllStatesForAdmin(),
      supabase.from("passport_areas").select("id, name"),
    ]);
    areaNameById = new Map((allAreas ?? []).map((a) => [a.id as string, a.name as string]));
    const productsByStateId = new Map<string, PassportProduct[]>();
    for (const product of allProducts) {
      const list = productsByStateId.get(product.state_id) ?? [];
      list.push(product);
      productsByStateId.set(product.state_id, list);
    }
    productsByState = allStates
      .map((state) => ({ state, products: productsByStateId.get(state.id) ?? [] }))
      .filter((entry) => entry.products.length > 0);
  }

  return (
    <div className="max-w-4xl">
      <Link href="/admin/passport-holders" className="text-sm text-slate-500 hover:text-slate-700">
        &larr; Back to holders
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{holder.full_name || holder.email || "Unnamed holder"}</h1>
        {holder.deleted_at && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Deleted</span>
        )}
        {holder.suspended_at && !holder.deleted_at && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Suspended</span>
        )}
        {!editing && (
          <Link
            href={`${baseHref}?mode=edit`}
            className="ml-auto rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            Edit
          </Link>
        )}
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Profile Information / Edit                                     */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-slate-900">Profile information</h2>

        {editing ? (
          <form action={updateHolderProfile.bind(null, profileId)} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">First name</span>
                <input name="first_name" defaultValue={holder.first_name ?? ""} className={`${inputClass} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Last name</span>
                <input name="last_name" defaultValue={holder.last_name ?? ""} className={`${inputClass} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Email</span>
                <input value={holder.email ?? ""} disabled className={`${inputClass} w-full bg-slate-50 text-slate-400`} />
                <span className="mt-1 block text-xs text-slate-400">Email changes go through account security.</span>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Phone</span>
                <input name="phone" defaultValue={holder.phone ?? ""} className={`${inputClass} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Age range</span>
                <select name="age_range" defaultValue={holder.age_range ?? ""} className={`${inputClass} w-full`}>
                  <option value="">Not set</option>
                  {AGE_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-3">
              <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Save changes
              </button>
              <Link
                href={baseHref}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Name</dt>
              <dd className="text-sm text-slate-900">{holder.full_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="text-sm text-slate-900">{holder.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd className="text-sm text-slate-900">{holder.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Age range</dt>
              <dd className="text-sm text-slate-900">{holder.age_range ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Joined</dt>
              <dd className="text-sm text-slate-900">{new Date(holder.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* State / Region                                                  */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-slate-900">State / Region</h2>
        <p className="mt-1 text-xs text-slate-500">
          A Passport is valid only in the region it was purchased for.
          {!currentUser.isNationalAdmin && " Only a national admin can reassign a Passport to a different region."}
        </p>
        <ul className="mt-4 divide-y divide-slate-100">
          {passports.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {p.areaName ?? "Unknown region"}, {p.stateName ?? "Unknown state"}
                </p>
                <p className="text-xs text-slate-500">Expires {new Date(p.expires_at).toLocaleDateString()}</p>
              </div>
              {currentUser.isNationalAdmin && productsByState.length > 0 && (
                <form action={reassignPassportState.bind(null, p.id, profileId)} className="flex items-center gap-2">
                  <select name="passport_product_id" defaultValue={p.passport_product_id} className={inputClass}>
                    {productsByState.map(({ state, products }) => (
                      <optgroup key={state.id} label={state.name}>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {areaNameById.get(product.passport_area_id) ?? "Unknown region"} - {product.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500">
                    Reassign
                  </button>
                </form>
              )}
            </li>
          ))}
          {passports.length === 0 && <li className="py-3 text-sm text-slate-500">No Passports yet.</li>}
        </ul>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Passports                                                       */}
      {/* -------------------------------------------------------------- */}
      {passports.map((p) => (
        <section key={p.id} className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">{formatPassportNumber(p.passport_number)}</h2>
              <p className="text-xs text-slate-500">{p.productName ?? "Unknown product"}</p>
            </div>
            <form action={updatePassportStatus.bind(null, p.id, profileId)} className="flex items-center gap-2">
              <select name="status" defaultValue={p.status} className={inputClass}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500">
                Save status
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="text-sm text-slate-600">
              <p>Purchased {new Date(p.purchased_at).toLocaleDateString()}</p>
              {p.priceCents != null && <p className="text-xs text-slate-400">${(p.priceCents / 100).toFixed(2)}</p>}
            </div>
            <form action={updatePassportExpiry.bind(null, p.id, profileId)} className="flex items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">End date</span>
                <input type="date" name="expires_at" defaultValue={toDateInputValue(p.expires_at)} className={inputClass} />
              </label>
              <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500">
                Save
              </button>
            </form>
          </div>

          <form
            action={updatePassportTravelDates.bind(null, p.id, profileId)}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
          >
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Travel start date</span>
              <input
                type="date"
                name="travel_start_date"
                defaultValue={toDateInputValue(p.travel_start_date)}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Travel end date</span>
              <input
                type="date"
                name="travel_end_date"
                defaultValue={toDateInputValue(p.travel_end_date)}
                className={inputClass}
              />
            </label>
            <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500">
              Save travel dates
            </button>
          </form>
        </section>
      ))}

      {/* -------------------------------------------------------------- */}
      {/* Redemption History                                              */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-slate-900">Redemption history</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {redemptions.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-800">
                {r.offerTitle} &middot; {r.businessName}
              </span>
              <span className="text-slate-500">{new Date(r.redeemed_at).toLocaleDateString()}</span>
            </li>
          ))}
          {redemptions.length === 0 && <li className="py-2 text-sm text-slate-500">No redemptions found.</li>}
        </ul>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Favorite Businesses                                             */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-slate-900">Favorite businesses</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {favorites.map((b) => (
            <li key={b.id} className="py-2 text-sm">
              <Link
                href={`/admin/areas/${b.passport_area_id}/businesses/${b.id}`}
                className="font-medium text-slate-800 hover:underline"
              >
                {b.name}
              </Link>
              <span className="ml-2 text-slate-500">
                {b.areaName ?? "Unknown area"}
                {b.stateName ? `, ${b.stateName}` : ""}
              </span>
            </li>
          ))}
          {favorites.length === 0 && <li className="py-2 text-sm text-slate-500">No favorite businesses found.</li>}
        </ul>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Account Security                                                */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-slate-900">Account security</h2>
        <p className="mt-1 text-sm text-slate-600">Holder email: {holder.email ?? "-"}</p>
        {holder.email && (
          <form action={sendHolderPasswordReset.bind(null, profileId, holder.email)} className="mt-3">
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
              Send password reset email
            </button>
          </form>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Account Actions (national admin only)                          */}
      {/* -------------------------------------------------------------- */}
      {currentUser.isNationalAdmin && (
        <section className={`${cardClass} border-red-200`}>
          <h2 className="font-semibold text-red-700">Account actions</h2>

          {confirm && ["suspend", "reactivate", "delete", "restore"].includes(confirm) ? (
            <div className="mt-4 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">
                Are you sure you want to {confirm.replace("delete", "soft-delete")} this account?
              </p>
              <div className="mt-3 flex gap-3">
                <form
                  action={
                    confirm === "suspend"
                      ? suspendHolder.bind(null, profileId)
                      : confirm === "reactivate"
                        ? reactivateHolder.bind(null, profileId)
                        : confirm === "delete"
                          ? softDeleteHolder.bind(null, profileId)
                          : restoreHolder.bind(null, profileId)
                  }
                >
                  <button className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                    Confirm
                  </button>
                </form>
                <Link
                  href={baseHref}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  Cancel
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {holder.suspended_at ? (
                <Link
                  href={`${baseHref}?confirm=reactivate`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  Reactivate account
                </Link>
              ) : (
                <Link
                  href={`${baseHref}?confirm=suspend`}
                  className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:border-amber-500"
                >
                  Suspend account
                </Link>
              )}
              {holder.deleted_at ? (
                <Link
                  href={`${baseHref}?confirm=restore`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
                >
                  Restore account
                </Link>
              ) : (
                <Link
                  href={`${baseHref}?confirm=delete`}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Soft delete account
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
