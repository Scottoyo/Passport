import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea, State } from "@/lib/types/domain";
import { RegisterBusinessForm } from "@/components/register-business-form";

export const metadata: Metadata = { title: "Register a Business" };

export default async function RegisterBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; region?: string }>;
}) {
  const { state: stateSlug, region: regionSlug } = await searchParams;
  const supabase = await createClient();

  const [{ data: states }, { data: areas }] = await Promise.all([
    supabase.from("states").select("*").eq("status", "active").order("name").returns<State[]>(),
    supabase.from("passport_areas").select("*").eq("status", "active").order("name").returns<PassportArea[]>(),
  ]);

  const areasByState = new Map<string, PassportArea[]>();
  for (const area of areas ?? []) {
    const list = areasByState.get(area.state_id) ?? [];
    list.push(area);
    areasByState.set(area.state_id, list);
  }

  const statesWithAreas = (states ?? []).map((state) => ({
    state,
    areas: areasByState.get(state.id) ?? [],
  }));

  const initialState = stateSlug ? (states ?? []).find((s) => s.slug === stateSlug) ?? null : null;
  const initialArea =
    initialState && regionSlug
      ? (areasByState.get(initialState.id) ?? []).find((a) => a.slug === regionSlug) ?? null
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Register a Business</h1>
      <p className="mt-2 text-slate-600">
        Your business will be reviewed and you will be contacted shortly.
      </p>

      <div className="mt-8">
        <RegisterBusinessForm
          statesWithAreas={statesWithAreas}
          initialStateId={initialState?.id ?? ""}
          initialAreaId={initialArea?.id ?? ""}
        />
      </div>
    </div>
  );
}
