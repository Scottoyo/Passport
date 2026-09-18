import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          National Passport
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/states" className="hover:text-slate-900">
            Explore States
          </Link>
          <Link href="/passport" className="hover:text-slate-900">
            Get the Passport
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm font-medium">
          {user ? (
            <Link
              href="/account"
              className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
            >
              My Passport
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
