"use client";

import { useMemo, useState } from "react";
import { updateMarketingRequestStatus } from "@/app/admin/marketing-requests/actions";
import type { MarketingRequest } from "@/lib/types/domain";

export interface MarketingRequestRow {
  id: string;
  title: string;
  details: string | null;
  status: MarketingRequest["status"];
  start_date: string | null;
  end_date: string | null;
  admin_notes: string | null;
  created_at: string;
  businessName: string | null;
  areaName: string;
}

const STATUS_META: Record<MarketingRequest["status"], { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-slate-100 text-slate-700" },
  in_review: { label: "In review", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", className: "bg-indigo-100 text-indigo-700" },
  live: { label: "Live", className: "bg-green-100 text-green-700" },
  completed: { label: "Completed", className: "bg-slate-200 text-slate-700" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700" },
};

const STATUS_ORDER: MarketingRequest["status"][] = [
  "submitted",
  "in_review",
  "approved",
  "live",
  "completed",
  "declined",
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(dateOnly: string | null): string {
  if (!dateOnly) return "-";
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MarketingRequestsTable({
  requests,
  price,
  serviceLabel,
}: {
  requests: MarketingRequestRow[];
  price: string;
  serviceLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MarketingRequest["status"]>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${r.businessName ?? ""} ${r.title} ${r.details ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search, statusFilter]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business, campaign, contact name, or email"
          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | MarketingRequest["status"])}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Marketing Service</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Requested Date</th>
              <th className="px-4 py-3">Preferred Start</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No marketing requests found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <RequestRow
                key={r.id}
                request={r}
                price={price}
                serviceLabel={serviceLabel}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestRow({
  request: r,
  price,
  serviceLabel,
  expanded,
  onToggle,
}: {
  request: MarketingRequestRow;
  price: string;
  serviceLabel: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = STATUS_META[r.status];
  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3 font-medium text-slate-900">
          {r.businessName ?? "Unknown business"}
          <div className="text-xs font-normal text-slate-400">{r.areaName}</div>
        </td>
        <td className="px-4 py-3 text-slate-600">{serviceLabel}</td>
        <td className="px-4 py-3 text-slate-600">
          <span className="line-clamp-2">{r.details || r.title}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDateTime(r.created_at)}</td>
        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(r.start_date)}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{price || "-"}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
          >
            {expanded ? "Close" : "Manage"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-slate-50 px-4 py-4">
            <form action={updateMarketingRequestStatus.bind(null, r.id, "in_review")} className="space-y-2">
              <textarea
                name="admin_notes"
                defaultValue={r.admin_notes ?? ""}
                placeholder="Notes for the requester"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  name="start_date"
                  type="date"
                  defaultValue={r.start_date ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="end_date"
                  type="date"
                  defaultValue={r.end_date ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusButton status="in_review" requestId={r.id} label="Mark in review" />
                <StatusButton status="approved" requestId={r.id} label="Approve" />
                <StatusButton status="live" requestId={r.id} label="Mark live" />
                <StatusButton status="completed" requestId={r.id} label="Mark complete" />
                <StatusButton status="declined" requestId={r.id} label="Decline" />
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusButton({
  status,
  requestId,
  label,
}: {
  status: MarketingRequest["status"];
  requestId: string;
  label: string;
}) {
  return (
    <button
      formAction={updateMarketingRequestStatus.bind(null, requestId, status)}
      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
    >
      {label}
    </button>
  );
}
