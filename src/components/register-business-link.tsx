"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Non-state route segments — anything else in the first path segment is
// treated as a state slug (matches how /[state] routing already works
// throughout the app). Used only to prefill the registration form's
// dropdowns as a convenience; the form re-validates against the database
// regardless.
const RESERVED_SEGMENTS = new Set([
  "admin",
  "passport",
  "account",
  "sign-in",
  "auth",
  "faq",
  "states",
  "register-business",
]);

export function RegisterBusinessLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  let href = "/register-business";
  if (segments.length > 0 && !RESERVED_SEGMENTS.has(segments[0])) {
    const state = segments[0];
    if (segments.length > 1 && segments[1] !== "businesses") {
      href = `/register-business?state=${state}&region=${segments[1]}`;
    } else {
      href = `/register-business?state=${state}`;
    }
  }

  return (
    <Link href={href} className={className}>
      Register a Business
    </Link>
  );
}
