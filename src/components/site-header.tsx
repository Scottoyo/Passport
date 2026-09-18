import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { signOut } from "@/app/auth/actions";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          National Passport
        </Link>

        {currentUser?.isNationalAdmin ? (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link href="/#states" className="hover:text-slate-900">
                Discover
              </Link>
              <Link
                href="/admin"
                className="rounded-full bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700"
              >
                Portal
              </Link>
            </nav>
            <form action={signOut}>
              <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                <SignOutIcon />
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
              <Link href="/#states" className="hover:text-slate-900">
                Explore States
              </Link>
              <Link href="/passport" className="hover:text-slate-900">
                Get the Passport
              </Link>
            </nav>
            <div className="flex items-center gap-3 text-sm font-medium">
              {currentUser ? (
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
          </>
        )}
      </div>
    </header>
  );
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M7.5 17.5H4.5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 14 17.5 10 13.5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 10H7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
