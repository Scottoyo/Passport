import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";
import type { State } from "@/lib/types/domain";

export const metadata: Metadata = { title: "My Passport" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/account");

  const passports = await getMyPassports(user.id);

  const stateIds = [...new Set(passports.map((p) => p.state_id))];
  const { data: states } = stateIds.length
    ? await supabase.from("states").select("*").in("id", stateIds).returns<State[]>()
    : { data: [] as State[] };
  const stateById = new Map((states ?? []).map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">My Passports</h1>
      <p className="mt-1 text-slate-600">{user.email}</p>

      {passports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600">You don&apos;t have a Passport yet.</p>
          <Link
            href="/passport"
            className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Get the Passport
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
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
              </div>
            );
          })}
          <Link
            href="/passport"
            className="inline-block text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Get a Passport for another state &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
