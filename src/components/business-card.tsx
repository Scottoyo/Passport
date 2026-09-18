import Link from "next/link";
import type { Business } from "@/lib/types/domain";

export function BusinessCard({
  business,
  href,
}: {
  business: Business;
  href: string;
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
    </Link>
  );
}
