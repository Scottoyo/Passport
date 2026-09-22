"use client";

import { buttonClasses } from "@/lib/ui-classes";

interface ExportRow {
  name: string;
  category: string;
  area: string;
  state: string;
  status: string;
  approvalStatus: string;
  featured: boolean;
  updatedAt: string;
}

function toCsvValue(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ExportBusinessesCsvButton({ rows }: { rows: ExportRow[] }) {
  function handleExport() {
    const header = ["Business", "Category", "Area", "State", "Status", "Approval", "Featured", "Updated"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.name,
          r.category,
          r.area,
          r.state,
          r.status,
          r.approvalStatus,
          r.featured ? "Yes" : "No",
          r.updatedAt,
        ]
          .map(toCsvValue)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `businesses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleExport} className={buttonClasses("outline")}>
      Export CSV
    </button>
  );
}
