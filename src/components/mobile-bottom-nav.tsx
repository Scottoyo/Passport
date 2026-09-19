"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface MobileBottomNavTab {
  href: string;
  label: string;
  icon: "home" | "discover" | "passport" | "account";
}

export function MobileBottomNav({
  tabs,
  breakpoint = "sm",
}: {
  tabs: MobileBottomNavTab[];
  // Must match whichever breakpoint the caller's own desktop nav switches
  // on - otherwise there's a dead zone between this bar's own hidden
  // breakpoint and the desktop nav's visible one where neither renders.
  breakpoint?: "sm" | "lg";
}) {
  const pathname = usePathname();

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white ${
        breakpoint === "lg" ? "lg:hidden" : "sm:hidden"
      }`}
    >
      {tabs.map((tab) => {
        // Home's href is often a literal prefix of the other tabs' hrefs
        // (e.g. region home "/florida/orlando" vs. discover
        // "/florida/orlando/discover") - only Home needs an exact match, the
        // rest can match their own nested sub-pages too (e.g. Account
        // staying active on /account/settings).
        const isActive =
          pathname === tab.href || (tab.icon !== "home" && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              isActive ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <TabIcon icon={tab.icon} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ icon }: { icon: MobileBottomNavTab["icon"] }) {
  const props = {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    className: "h-5 w-5",
    "aria-hidden": true,
  } as const;

  switch (icon) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 9.5 10 3l7 6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 8.5V16a1 1 0 0 0 1 1h3v-4.5h2V17h3a1 1 0 0 0 1-1V8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "discover":
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m12.5 7.5-1.8 4.2-4.2 1.8 1.8-4.2 4.2-1.8Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "passport":
      return (
        <svg {...props}>
          <rect x="4" y="3" width="12" height="14" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="8.5" r="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 13.5h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "account":
      return (
        <svg {...props}>
          <circle cx="10" cy="7" r="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
