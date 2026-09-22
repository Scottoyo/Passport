import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";
import { ForBusinessesContent } from "@/components/for-businesses-content";

interface Props {
  params: Promise<{ state: string; area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return {};

  const title = "Join The Passport | Reach Locals & Visitors";
  const description =
    "List your local business, create an exclusive Passport perk, and reach locals and visitors ready to eat, shop, explore, and experience more. Free to join.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function ForBusinessesPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const registerHref = `/register-business?state=${state.slug}&region=${area.slug}`;

  return <ForBusinessesContent registerHref={registerHref} />;
}
