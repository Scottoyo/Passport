import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, getAccessibleAreaIdsForCapability, hasAnyCapability } from "@/lib/permissions";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds } from "@/lib/admin-scope";
import {
  getBusinessLeads,
  getLeadsAccessibleStatesWithAreas,
  type BusinessLeadsFilters,
} from "@/lib/business-leads-queries";
import { BusinessLeadsFilterBar } from "@/components/admin/business-leads-filter-bar";
import type { BusinessLeadDisposition } from "@/lib/types/domain";

export const metadata: Metadata = { title: "Business Leads CRM" };

const DISPOSITION_LABELS: Record<BusinessLeadDisposition, string> = {
  lead: "Lead",
  in_progress: "In Progress",
  closed_won: "Closed Won",
  lost: "Lost",
};

const DISPOSITION_STYLES: Record<BusinessLeadDisposition, string> = {
  lead: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  closed_won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-700",
};

const VALID_DISPOSITIONS = new Set<string>(["lead", "in_progress", "closed_won", "lost"]);
const VALID_SORTS = new Set(["business_name", "created_at", "updated_at"]);

interface Props {
  searchParams: Promise<{
    q?: string;
    state?: string;
    region?: string;
    disposition?: string;
    emailed?: string;
    called?: string;
    visited?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}

function parseTriState(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function sortLink(
  basePath: string,
  params: Awaited<Props["searchParams"]>,
  column: "business_name" | "created_at" | "updated_at",
  label: string
) {
  const currentSort = VALID_SORTS.has(params.sort ?? "") ? params.sort : "updated_at";
  const currentDir = params.dir === "asc" ? "asc" : "desc";
  const nextDir = currentSort === column && currentDir === "asc" ? "desc" : "asc";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "sort" && k !== "dir" && k !== "page") qs.set(k, v);
  }
  qs.set("sort", column);
  qs.set("dir", nextDir);
  const indicator = currentSort === column ? (currentDir === "asc" ? " ↑" : " ↓") : "";
  return (
    <Link href={`${basePath}?${qs.toString()}`} className="hover:text-slate-900">
      {label}
      {indicator}
    </Link>
  );
}

export default async function BusinessLeadsPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/business-leads");
  if (!hasAnyCapability(currentUser, "manage_leads")) redirect("/admin");

  const params = await searchParams;

  const { state: scopeState, area: scopeArea } = await getCurrentAdminScope();
  const baseAreaIds = currentUser.isNationalAdmin
    ? scopeState
      ? await getAreaIdsForState(scopeState.id)
      : null
    : await getAccessibleAreaIdsForCapability(currentUser, "manage_leads");
  const scopedAreaIds = baseAreaIds ? narrowAreaIds(baseAreaIds, scopeArea) : null;

  const filters: BusinessLeadsFilters = {
    q: params.q,
    disposition: VALID_DISPOSITIONS.has(params.disposition ?? "")
      ? (params.disposition as BusinessLeadDisposition)
      : undefined,
    emailed: parseTriState(params.emailed),
    called: parseTriState(params.called),
    visited: parseTriState(params.visited),
    sort: VALID_SORTS.has(params.sort ?? "") ? (params.sort as BusinessLeadsFilters["sort"]) : "updated_at",
    dir: params.dir === "asc" ? "asc" : "desc",
    page: params.page ? Number(params.page) || 1 : 1,
  };

  // The state/region filter dropdowns additionally respect the current
  // admin state/region selector - a manager or national admin who has
  // narrowed to Florida shouldn't see Georgia in the filter's own state
  // list either.
  const [{ leads, total, page, pageCount }, statesWithAreas] = await Promise.all([
    getBusinessLeads(scopedAreaIds, filters),
    getLeadsAccessibleStatesWithAreas(currentUser),
  ]);

  const basePath = "/admin/business-leads";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Leads CRM</h1>
          <p className="mt-1 text-slate-600">
            Prospective businesses being courted to join the Passport - separate from live listings.
          </p>
        </div>
        <Link
          href="/admin/business-leads/new"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Add Lead
        </Link>
      </div>

      <BusinessLeadsFilterBar statesWithAreas={statesWithAreas} />

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{sortLink(basePath, params, "business_name", "Business Name")}</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Contact Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Disposition</th>
              <th className="px-4 py-3">Emailed</th>
              <th className="px-4 py-3">Called</th>
              <th className="px-4 py-3">Visited</th>
              <th className="px-4 py-3">{sortLink(basePath, params, "updated_at", "Last Updated")}</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                  {total === 0 && !filters.q && !filters.disposition
                    ? "No leads yet - add your first one to get started."
                    : "No leads match this search/filter combination."}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{lead.business_name}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.state?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.area?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[lead.contact_first_name, lead.contact_last_name].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.email ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPOSITION_STYLES[lead.disposition]}`}
                    >
                      {DISPOSITION_LABELS[lead.disposition]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ActivityIndicator on={lead.emailed} />
                  </td>
                  <td className="px-4 py-3">
                    <ActivityIndicator on={lead.called} />
                  </td>
                  <td className="px-4 py-3">
                    <ActivityIndicator on={lead.visited} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(lead.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/business-leads/${lead.id}`}
                      className="font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 lg:hidden">
        {leads.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 px-4 py-8 text-center text-slate-500">
            {total === 0 && !filters.q && !filters.disposition
              ? "No leads yet - add your first one to get started."
              : "No leads match this search/filter combination."}
          </p>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/business-leads/${lead.id}`}
              className="block rounded-2xl border border-slate-200 p-4 hover:border-slate-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{lead.business_name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {lead.area?.name ?? "-"}, {lead.state?.name ?? "-"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISPOSITION_STYLES[lead.disposition]}`}
                >
                  {DISPOSITION_LABELS[lead.disposition]}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {[lead.contact_first_name, lead.contact_last_name].filter(Boolean).join(" ") || "No contact name"}
              </p>
              <p className="text-sm text-slate-500">{lead.phone || lead.email || "No phone or email"}</p>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Emailed <ActivityIndicator on={lead.emailed} /></span>
                <span>Called <ActivityIndicator on={lead.called} /></span>
                <span>Visited <ActivityIndicator on={lead.visited} /></span>
              </div>
            </Link>
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <p>
            Page {page} of {pageCount} - {total} lead{total === 1 ? "" : "s"} total
          </p>
          <div className="flex gap-2">
            <PageLink basePath={basePath} params={params} page={page - 1} disabled={page <= 1} label="Previous" />
            <PageLink basePath={basePath} params={params} page={page + 1} disabled={page >= pageCount} label="Next" />
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityIndicator({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
        on ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
      }`}
      aria-label={on ? "Yes" : "No"}
    >
      {on ? (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden>
          <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden>
          <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function PageLink({
  basePath,
  params,
  page,
  disabled,
  label,
}: {
  basePath: string;
  params: Awaited<Props["searchParams"]>;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return <span className="rounded-full border border-slate-200 px-4 py-2 text-slate-300">{label}</span>;
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") qs.set(k, v);
  }
  qs.set("page", String(page));
  return (
    <Link
      href={`${basePath}?${qs.toString()}`}
      className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
    >
      {label}
    </Link>
  );
}
