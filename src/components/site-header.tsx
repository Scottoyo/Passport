import Link from "next/link";
import { getCurrentUser } from "@/lib/permissions";
import { signOut } from "@/app/auth/actions";
import { RegisterBusinessLink } from "@/components/register-business-link";
import { hasAnyPassport } from "@/lib/queries";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();
  const isAdmin =
    !!currentUser &&
    (currentUser.isNationalAdmin || currentUser.stateAssignments.length > 0 || currentUser.areaAssignments.length > 0);
  const ownsPassport = currentUser && !isAdmin ? await hasAnyPassport(currentUser.id) : false;

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          The Passport
        </Link>

        {isAdmin ? (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link
                href="/admin"
                className="rounded-full bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700"
              >
                Admin
              </Link>
            </nav>
            <form action={signOut}>
              <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                <SignOutIcon />
                Sign Out
              </button>
            </form>
          </>
        ) : currentUser ? (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
              <Link href="/#states" className="hover:text-slate-900">
                Explore States
              </Link>
              <Link href="/account/discover" className="hover:text-slate-900">
                Discover
              </Link>
            </nav>
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link
                href="/account"
                className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
              >
                {ownsPassport ? "My Passport" : "My Profile"}
              </Link>
              <form action={signOut}>
                <button className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
                  <SignOutIcon />
                  Log Out
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <Link href="/#states" className="hover:text-slate-900">
                Discover
              </Link>
              <Link href="/faq" className="hover:text-slate-900">
                FAQ
              </Link>
            </nav>
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-medium">
              <Link href="/sign-in" className="text-slate-600 hover:text-slate-900">
                Login
              </Link>
              <Link
                href="/passport"
                className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
              >
                Get Your Passport
              </Link>
              <Link
                href="/create-profile"
                className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-500"
              >
                Create a Profile
              </Link>
              <RegisterBusinessLink className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:border-slate-500" />
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
