import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPrimaryRegion, getStateBySlug, getAreaBySlug } from "@/lib/queries";
import { DiscoverAreaContent } from "@/components/discover-area-content";

interface Props {
  searchParams: Promise<{ q?: string; category?: string; subarea?: string }>;
}

export default async function AccountDiscoverPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/discover");

  const region = await getMyPrimaryRegion(user.id);
  if (!region) redirect("/states");

  const state = await getStateBySlug(region.stateSlug);
  if (!state) redirect("/states");
  const area = await getAreaBySlug(state.id, region.areaSlug);
  if (!area) redirect("/states");

  const resolvedSearchParams = await searchParams;

  return (
    <DiscoverAreaContent
      state={state}
      area={area}
      searchParams={resolvedSearchParams}
      basePath="/account/discover"
      passportHref="/account/passport"
      showPassportCta={false}
    />
  );
}
