import Link from "next/link";
import type { State, PassportArea } from "@/lib/types/domain";

export function SiteFooter({ region }: { region: { state: State; area: PassportArea } | null }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} The Passport.</p>
        <div className="flex gap-4">
          <Link href="/#states" className="hover:text-slate-700">
            States
          </Link>
          <Link href="/passport" className="hover:text-slate-700">
            The Passport
          </Link>
          {region && (
            <Link
              href={`/${region.state.slug}/${region.area.slug}/for-businesses`}
              className="hover:text-slate-700"
            >
              For Businesses
            </Link>
          )}
          <Link href="/admin" className="hover:text-slate-700">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
