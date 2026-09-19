"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRegisterBusinessHref } from "@/lib/register-business-href";

export function RegisterBusinessLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const href = getRegisterBusinessHref(pathname);

  return (
    <Link href={href} className={className}>
      Register a Business
    </Link>
  );
}
