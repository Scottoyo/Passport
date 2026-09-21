import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, hasAnyCapability } from "@/lib/permissions";
import { getBusinessLead, getBusinessLeadNotes, getLeadsAccessibleStatesWithAreas } from "@/lib/business-leads-queries";
import { BusinessLeadForm } from "@/components/admin/business-lead-form";
import { BusinessLeadNotes } from "@/components/admin/business-lead-notes";
import { LeadDispositionSelect, LeadActivityToggle } from "@/components/admin/business-lead-quick-actions";
import type { BusinessLeadDisposition } from "@/lib/types/domain";

const DISPOSITION_LABELS: Record<BusinessLeadDisposition, string> = {
  lead: "Lead",
  in_progress: "In Progress",
  closed_won: "Closed Won",
  lost: "Lost",
};

interface Props {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { leadId } = await params;
  const lead = await getBusinessLead(leadId);
  return { title: lead ? `${lead.business_name} | Business Leads CRM` : "Business Leads CRM" };
}

export default async function BusinessLeadDetailPage({ params, searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(`/sign-in?next=/admin/business-leads`);
  if (!hasAnyCapability(currentUser, "manage_leads")) redirect("/admin");

  const { leadId } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = modeParam === "edit" ? "edit" : "view";

  // getBusinessLead is RLS-scoped - an unauthorized lead id (foreign
  // state/region, or one belonging to a national-admin-only scope) comes
  // back as null here exactly like a nonexistent one, so a forged id never
  // distinguishes "exists but not yours" from "doesn't exist".
  const lead = await getBusinessLead(leadId);
  if (!lead) notFound();

  const baseHref = `/admin/business-leads/${leadId}`;

  if (mode === "edit") {
    const statesWithAreas = await getLeadsAccessibleStatesWithAreas(currentUser);
    return (
      <div className="mx-auto max-w-2xl">
        <Link href={baseHref} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          &larr; {lead.business_name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Edit Lead</h1>
        <div className="mt-8">
          <BusinessLeadForm mode="edit" leadId={leadId} statesWithAreas={statesWithAreas} initialValues={lead} />
        </div>
      </div>
    );
  }

  const notes = await getBusinessLeadNotes(leadId);
  const contactName = [lead.contact_first_name, lead.contact_last_name].filter(Boolean).join(" ");

  return (
    <div>
      <Link href="/admin/business-leads" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
        &larr; Business Leads CRM
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lead.business_name}</h1>
          <p className="mt-1 text-slate-600">
            {lead.area?.name ?? "Unknown region"}, {lead.state?.name ?? "Unknown state"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LeadDispositionSelect key={lead.disposition} leadId={leadId} current={lead.disposition} />
          <Link
            href={`${baseHref}?mode=edit`}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Lead details</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Disposition</dt>
              <dd className="text-slate-900">{DISPOSITION_LABELS[lead.disposition]}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contact</dt>
              <dd className="text-slate-900">{contactName || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-slate-900">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-slate-900 hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-slate-900 hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-900">{new Date(lead.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last updated</dt>
              <dd className="text-slate-900">{new Date(lead.updated_at).toLocaleString()}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-100 pt-4">
            <LeadActivityToggle
              key={`emailed-${lead.emailed}`}
              leadId={leadId}
              field="emailed"
              label="Emailed"
              checked={lead.emailed}
            />
            <LeadActivityToggle
              key={`called-${lead.called}`}
              leadId={leadId}
              field="called"
              label="Called"
              checked={lead.called}
            />
            <LeadActivityToggle
              key={`visited-${lead.visited}`}
              leadId={leadId}
              field="visited"
              label="Visited"
              checked={lead.visited}
            />
          </div>
        </section>

        <BusinessLeadNotes leadId={leadId} notes={notes} />
      </div>
    </div>
  );
}
