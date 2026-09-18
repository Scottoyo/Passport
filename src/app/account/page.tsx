import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";

export const metadata: Metadata = { title: "My Passport" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/account");

  const passports = await getMyPassports(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">My Passport</h1>
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
          {passports.map((passport) => (
            <div key={passport.id} className="rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    passport.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {passport.status}
                </span>
                <span className="text-sm text-slate-500">
                  Expires {new Date(passport.expires_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Purchased {new Date(passport.purchased_at).toLocaleDateString()}
              </p>
              <p className="mt-4 text-sm text-slate-600">
                Valid nationwide — show this Passport at any participating
                business to redeem their offer.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
