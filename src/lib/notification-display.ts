import type { NotificationFeedItem } from "@/lib/types/domain";

// Shared by NotificationBell ("use client") and /account/notifications
// (a Server Component) - a plain function exported from a "use client"
// module can't be called from server code, only rendered as a component or
// passed as a prop, so this has to live in its own client-agnostic module.
export function describeEvent(e: NotificationFeedItem): { label: string; detail: string; href: string | null } {
  switch (e.event_type) {
    case "new_business":
      return {
        label: "New Business Added",
        detail: `${e.businessName} has joined the Passport!`,
        href: `/${e.stateSlug}/${e.areaSlug}/businesses/${e.businessSlug}`,
      };
    case "new_offer":
      return {
        label: "New Passport Promotion",
        detail: `${e.businessName} just added: ${e.offerTitle}`,
        href: `/${e.stateSlug}/${e.areaSlug}/businesses/${e.businessSlug}`,
      };
    case "achievement_unlocked":
      return {
        label: "Achievement Unlocked",
        detail: e.achievementName ? `You unlocked "${e.achievementName}"!` : "You unlocked a new achievement!",
        href: "/account/achievements",
      };
    case "admin_announcement":
      return {
        label: e.announcementTitle ?? "Announcement",
        detail: e.announcementBody ?? "",
        href: null,
      };
  }
}
