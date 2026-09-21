import "server-only";

import { createClient } from "@/lib/supabase/server";
import { NO_MATCH_ID } from "@/lib/admin-scope";
import { getAccessibleAreaIdsForCapability, type CurrentUser } from "@/lib/permissions";
import type { BusinessLead, BusinessLeadDisposition, BusinessLeadNote, PassportArea, State } from "@/lib/types/domain";

export const LEADS_PAGE_SIZE = 25;

// Every state/region a user could file a lead into or filter by - not
// gated on launch status, since prospecting into a not-yet-launched region
// is exactly when a CRM is most useful (unlike the consumer-facing
// state/area pickers, which only ever show "active" regions). Shared by
// the list filter bar and the Add/Edit Lead location pickers so all three
// always offer identical, correctly-scoped options.
export async function getLeadsAccessibleStatesWithAreas(
  currentUser: CurrentUser
): Promise<{ state: State; areas: PassportArea[] }[]> {
  const supabase = await createClient();

  function groupByState(states: State[], areas: PassportArea[]) {
    const areasByState = new Map<string, PassportArea[]>();
    for (const area of areas) {
      const list = areasByState.get(area.state_id) ?? [];
      list.push(area);
      areasByState.set(area.state_id, list);
    }
    return states.map((state) => ({ state, areas: areasByState.get(state.id) ?? [] }));
  }

  if (currentUser.isNationalAdmin) {
    const [{ data: states }, { data: areas }] = await Promise.all([
      supabase.from("states").select("*").order("name").returns<State[]>(),
      supabase.from("passport_areas").select("*").order("name").returns<PassportArea[]>(),
    ]);
    return groupByState(states ?? [], areas ?? []);
  }

  const areaIds = await getAccessibleAreaIdsForCapability(currentUser, "manage_leads");
  if (areaIds.length === 0) return [];

  const { data: areas } = await supabase
    .from("passport_areas")
    .select("*")
    .in("id", areaIds)
    .order("name")
    .returns<PassportArea[]>();
  const stateIds = [...new Set((areas ?? []).map((a) => a.state_id))];
  const { data: states } = await supabase
    .from("states")
    .select("*")
    .in("id", stateIds)
    .order("name")
    .returns<State[]>();

  return groupByState(states ?? [], areas ?? []);
}

export interface BusinessLeadRow extends BusinessLead {
  state: { name: string; slug: string } | null;
  area: { name: string; slug: string } | null;
}

export interface BusinessLeadsFilters {
  q?: string;
  disposition?: BusinessLeadDisposition;
  emailed?: boolean;
  called?: boolean;
  visited?: boolean;
  sort?: "business_name" | "created_at" | "updated_at";
  dir?: "asc" | "desc";
  page?: number;
}

// `areaIds`: null means unscoped (a national admin with no state/region
// selected - RLS still applies, this is just the app-layer query filter),
// an array (possibly empty) scopes to exactly those regions. Matches the
// same null-means-unscoped convention already used throughout admin
// queries (see getAdminScopedAreaIds).
export async function getBusinessLeads(
  areaIds: string[] | null,
  filters: BusinessLeadsFilters
): Promise<{ leads: BusinessLeadRow[]; total: number; page: number; pageCount: number }> {
  const supabase = await createClient();
  const sort = filters.sort ?? "updated_at";
  const dir = filters.dir ?? "desc";
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * LEADS_PAGE_SIZE;
  const to = from + LEADS_PAGE_SIZE - 1;

  let query = supabase
    .from("business_leads")
    .select("*, state:states(name,slug), area:passport_areas(name,slug)", { count: "exact" })
    .order(sort, { ascending: dir === "asc" })
    .range(from, to);

  if (areaIds) {
    query = query.in("passport_area_id", areaIds.length ? areaIds : [NO_MATCH_ID]);
  }
  if (filters.disposition) query = query.eq("disposition", filters.disposition);
  if (filters.emailed !== undefined) query = query.eq("emailed", filters.emailed);
  if (filters.called !== undefined) query = query.eq("called", filters.called);
  if (filters.visited !== undefined) query = query.eq("visited", filters.visited);

  const q = filters.q?.trim();
  if (q) {
    const escaped = q.replace(/[%_]/g, (c) => `\\${c}`);
    const orParts = [
      `business_name.ilike.%${escaped}%`,
      `contact_first_name.ilike.%${escaped}%`,
      `contact_last_name.ilike.%${escaped}%`,
      `phone.ilike.%${escaped}%`,
      `email.ilike.%${escaped}%`,
    ];
    // "First Last" full-name search: split on whitespace and also match
    // first/last across the two separate columns, not just each column
    // independently.
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const first = words[0].replace(/[%_]/g, (c) => `\\${c}`);
      const rest = words.slice(1).join(" ").replace(/[%_]/g, (c) => `\\${c}`);
      orParts.push(`and(contact_first_name.ilike.%${first}%,contact_last_name.ilike.%${rest}%)`);
    }
    query = query.or(orParts.join(","));
  }

  const { data, error, count } = await query.returns<BusinessLeadRow[]>();
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  return { leads: data ?? [], total, page, pageCount };
}

export async function getBusinessLead(leadId: string): Promise<BusinessLeadRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_leads")
    .select("*, state:states(name,slug), area:passport_areas(name,slug)")
    .eq("id", leadId)
    .maybeSingle<BusinessLeadRow>();
  return data ?? null;
}

export interface BusinessLeadNoteRow extends BusinessLeadNote {
  author: { full_name: string | null; email: string | null } | null;
}

// Two queries + a JS merge, rather than an embedded `profiles!<fk>(...)`
// select - avoids depending on Postgres's auto-generated FK constraint
// name, matching the same "fetch related rows separately, join via a Map"
// pattern already used for business/area names on the marketing-requests
// admin page.
export async function getBusinessLeadNotes(leadId: string): Promise<BusinessLeadNoteRow[]> {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("business_lead_notes")
    .select("*")
    .eq("business_lead_id", leadId)
    .order("created_at", { ascending: false })
    .returns<BusinessLeadNote[]>();
  const rows = notes ?? [];
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((n) => n.created_by))];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", authorIds);
  const authorById = new Map((authors ?? []).map((a) => [a.id as string, a]));

  return rows.map((n) => ({ ...n, author: authorById.get(n.created_by) ?? null }));
}
