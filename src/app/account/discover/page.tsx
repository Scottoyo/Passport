import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";

export default async function AccountDiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/discover");

  const passports = await getMyPassports(user.id);
  if (passports.length === 0) redirect("/passport");

  const { data: area } = await supabase
    .from("passport_areas")
    .select("slug, state_id")
    .eq("id", passports[0].passport_area_id)
    .maybeSingle();
  if (!area) redirect("/");

  const { data: state } = await supabase.from("states").select("slug").eq("id", area.state_id).maybeSingle();
  if (!state) redirect("/");

  redirect(`/${state.slug}/${area.slug}`);
}
