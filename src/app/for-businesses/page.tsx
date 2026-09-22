import type { Metadata } from "next";
import { ForBusinessesContent } from "@/components/for-businesses-content";

export const metadata: Metadata = {
  title: "Join The Passport | Reach Locals & Visitors",
  description:
    "List your local business, create an exclusive Passport perk, and reach locals and visitors ready to eat, shop, explore, and experience more. Free to join.",
};

// The same standardized marketing page every region's own
// /[state]/[area]/for-businesses shows, reachable without picking a region
// first - for a visitor arriving from the state or national pages' footer.
// The "Register Your Business" links go to the plain registration form
// (no region prefill) rather than a specific region's, since none is known
// here - the form itself lets them pick their state and region.
export default function ForBusinessesPage() {
  return <ForBusinessesContent registerHref="/register-business" />;
}
