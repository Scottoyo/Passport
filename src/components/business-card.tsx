import Link from "next/link";
import type { Business, Offer } from "@/lib/types/domain";

export function BusinessCard({
  business,
  href,
  offer,
}: {
  business: Business;
  href: string;
  offer?: Offer | null;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 p-6 transition-colors hover:border-slate-400"
    >
      <h3 className="text-lg font-semibold text-slate-900">{business.name}</h3>
      {business.city && (
        <p className="mt-1 text-sm text-slate-500">
          {business.city}
          {business.state_code ? `, ${business.state_code}` : ""}
        </p>
      )}
      {business.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
          {business.description}
        </p>
      )}
      {offer && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Passport promotion
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">{offer.title}</p>
        </div>
      )}
    </Link>
  );
}
