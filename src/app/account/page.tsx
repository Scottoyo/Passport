import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";
import type { Profile, State } from "@/lib/types/domain";
import { updateMyProfile, updateMyPassportDates } from "./actions";

export const metadata: Metadata = { title: "My Passport" };

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/account");

  const { mode } = await searchParams;
  const editing = mode === "edit";

  const [passports, { data: profile }] = await Promise.all([
    getMyPassports(user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
  ]);

  const stateIds = [...new Set(passports.map((p) => p.state_id))];
  const { data: states } = stateIds.length
    ? await supabase.from("states").select("*").in("id", stateIds).returns<State[]>()
    : { data: [] as State[] };
  const stateById = new Map((states ?? []).map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        {!editing && (
          <Link
            href="/account?mode=edit"
            className="ml-auto rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            Edit profile
          </Link>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        {editing ? (
          <form action={updateMyProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">First name</span>
                <input name="first_name" defaultValue={profile?.first_name ?? ""} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Last name</span>
                <input name="last_name" defaultValue={profile?.last_name ?? ""} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Phone</span>
                <input name="phone" type="tel" defaultValue={profile?.phone ?? ""} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Age range</span>
                <select name="age_range" defaultValue={profile?.age_range ?? ""} className={inputClass}>
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
                href="/account"
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Name</dt>
              <dd className="text-sm text-slate-900">{profile?.full_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="text-sm text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd className="text-sm text-slate-900">{profile?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Age range</dt>
              <dd className="text-sm text-slate-900">{profile?.age_range ?? "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">My Passports</h2>

      {passports.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600">You don&apos;t have a Passport yet.</p>
          <Link
            href="/passport"
            className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Get the Passport
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {passports.map((passport) => {
            const state = stateById.get(passport.state_id);
            return (
              <div key={passport.id} className="rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {state?.name ?? "Unknown state"} Passport
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        passport.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {passport.status}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    Expires {new Date(passport.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Purchased {new Date(passport.purchased_at).toLocaleDateString()}
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  Valid at any participating business in {state?.name ?? "its state"}{" "}
                  — show this Passport at checkout to redeem an offer.
                </p>

                <form
                  action={updateMyPassportDates.bind(null, passport.id)}
                  className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
                >
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-600">Travel start date</span>
                    <input
                      type="date"
                      name="travel_start_date"
                      defaultValue={toDateInputValue(passport.travel_start_date)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-600">Travel end date</span>
                    <input
                      type="date"
                      name="travel_end_date"
                      defaultValue={toDateInputValue(passport.travel_end_date)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500">
                    Save travel dates
                  </button>
                </form>
              </div>
            );
          })}
          <Link
            href="/passport"
            className="inline-block text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Get A Passport For Another Region &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
