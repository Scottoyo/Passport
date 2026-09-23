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
import { buttonClasses } from "@/lib/ui-classes";
import { SaveButton } from "@/components/save-button";

const STATUS_OPTIONS: PassportStatus[] = ["active", "expired", "revoked"];
const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const cardClass = "mt-6 rounded-2xl border border-border bg-surface p-6";
const inputClass = "rounded-lg border border-border px-3 py-2 text-sm";

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
      <Link href="/admin/passport-holders" className="text-sm text-ink-muted hover:text-ink">
        &larr; Back to holders
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">{holder.full_name || holder.email || "Unnamed holder"}</h1>
        {holder.deleted_at && (
          <span className="rounded-full bg-error-bg px-3 py-1 text-xs font-semibold text-error">Deleted</span>
        )}
        {holder.suspended_at && !holder.deleted_at && (
          <span className="rounded-full bg-warning-bg px-3 py-1 text-xs font-semibold text-warning">Suspended</span>
        )}
        {!editing && (
          <Link
            href={`${baseHref}?mode=edit`}
            className={`ml-auto ${buttonClasses("outline", "sm")}`}
          >
            Edit
          </Link>
        )}
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Profile Information / Edit                                     */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-ink">Profile information</h2>

        {editing ? (
          <form action={updateHolderProfile.bind(null, profileId)} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">First name</span>
                <input name="first_name" defaultValue={holder.first_name ?? ""} className={`${inputClass} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">Last name</span>
                <input name="last_name" defaultValue={holder.last_name ?? ""} className={`${inputClass} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">Email</span>
                <input value={holder.email ?? ""} disabled className={`${inputClass} w-full bg-surface-elevated text-ink-muted`} />
                <span className="mt-1 block text-xs text-ink-muted">Email changes go through account security.</span>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">Phone</span>
                <input name="phone" defaultValue={holder.phone ?? ""} className={`${inputClass} w-full`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">Age range</span>
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
              <SaveButton>Save changes</SaveButton>
              <Link
                href={baseHref}
                className={buttonClasses("outline")}
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Name</dt>
              <dd className="text-sm text-ink">{holder.full_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Email</dt>
              <dd className="text-sm text-ink">{holder.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Phone</dt>
              <dd className="text-sm text-ink">{holder.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Age range</dt>
              <dd className="text-sm text-ink">{holder.age_range ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Joined</dt>
              <dd className="text-sm text-ink">{new Date(holder.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* State / Region                                                  */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-ink">State / Region</h2>
        <p className="mt-1 text-xs text-ink-muted">
          A Passport is valid only in the region it was purchased for.
          {!currentUser.isNationalAdmin && " Only a national admin can reassign a Passport to a different region."}
        </p>
        <ul className="mt-4 divide-y divide-border">
          {passports.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {p.areaName ?? "Unknown region"}, {p.stateName ?? "Unknown state"}
                </p>
                <p className="text-xs text-ink-muted">Expires {new Date(p.expires_at).toLocaleDateString()}</p>
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
                  <button className={buttonClasses("outline", "sm")}>
                    Reassign
                  </button>
                </form>
              )}
            </li>
          ))}
          {passports.length === 0 && <li className="py-3 text-sm text-ink-muted">No Passports yet.</li>}
        </ul>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Passports                                                       */}
      {/* -------------------------------------------------------------- */}
      {passports.map((p) => (
        <section key={p.id} className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-ink">{formatPassportNumber(p.passport_number)}</h2>
              <p className="text-xs text-ink-muted">{p.productName ?? "Unknown product"}</p>
            </div>
            <form action={updatePassportStatus.bind(null, p.id, profileId)} className="flex items-center gap-2">
              <select name="status" defaultValue={p.status} className={inputClass}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <SaveButton variant="outline" size="sm">Save status</SaveButton>
            </form>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="text-sm text-ink-muted">
              <p>Purchased {new Date(p.purchased_at).toLocaleDateString()}</p>
              {p.priceCents != null && <p className="text-xs text-ink-muted">${(p.priceCents / 100).toFixed(2)}</p>}
            </div>
            <form action={updatePassportExpiry.bind(null, p.id, profileId)} className="flex items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-ink-muted">End date</span>
                <input type="date" name="expires_at" defaultValue={toDateInputValue(p.expires_at)} className={inputClass} />
              </label>
              <SaveButton variant="outline" size="sm">Save</SaveButton>
            </form>
          </div>

          <form
            action={updatePassportTravelDates.bind(null, p.id, profileId)}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
          >
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Travel start date</span>
              <input
                type="date"
                name="travel_start_date"
                defaultValue={toDateInputValue(p.travel_start_date)}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Travel end date</span>
              <input
                type="date"
                name="travel_end_date"
                defaultValue={toDateInputValue(p.travel_end_date)}
                className={inputClass}
              />
            </label>
            <SaveButton variant="outline" size="sm">Save travel dates</SaveButton>
          </form>
        </section>
      ))}

      {/* -------------------------------------------------------------- */}
      {/* Redemption History                                              */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-ink">Redemption history</h2>
        <ul className="mt-3 divide-y divide-border">
          {redemptions.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink">
                {r.offerTitle} &middot; {r.businessName}
              </span>
              <span className="text-ink-muted">{new Date(r.redeemed_at).toLocaleDateString()}</span>
            </li>
          ))}
          {redemptions.length === 0 && <li className="py-2 text-sm text-ink-muted">No redemptions found.</li>}
        </ul>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Favorite Businesses                                             */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-ink">Favorite businesses</h2>
        <ul className="mt-3 divide-y divide-border">
          {favorites.map((b) => (
            <li key={b.id} className="py-2 text-sm">
              <Link
                href={`/admin/areas/${b.passport_area_id}/businesses/${b.id}`}
                className="font-medium text-ink hover:underline"
              >
                {b.name}
              </Link>
              <span className="ml-2 text-ink-muted">
                {b.areaName ?? "Unknown area"}
                {b.stateName ? `, ${b.stateName}` : ""}
              </span>
            </li>
          ))}
          {favorites.length === 0 && <li className="py-2 text-sm text-ink-muted">No favorite businesses found.</li>}
        </ul>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Account Security                                                */}
      {/* -------------------------------------------------------------- */}
      <section className={cardClass}>
        <h2 className="font-semibold text-ink">Account security</h2>
        <p className="mt-1 text-sm text-ink-muted">Holder email: {holder.email ?? "-"}</p>
        {holder.email && (
          <form action={sendHolderPasswordReset.bind(null, profileId, holder.email)} className="mt-3">
            <button className={buttonClasses("outline")}>
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
                  <button className="rounded-full bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                    Confirm
                  </button>
                </form>
                <Link
                  href={baseHref}
                  className={buttonClasses("outline")}
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
                  className={buttonClasses("outline")}
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
                  className={buttonClasses("outline")}
                >
                  Restore account
                </Link>
              ) : (
                <Link
                  href={`${baseHref}?confirm=delete`}
                  className="rounded-full bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
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
