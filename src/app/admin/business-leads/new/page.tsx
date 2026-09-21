import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser, hasAnyCapability } from "@/lib/permissions";
import { getLeadsAccessibleStatesWithAreas } from "@/lib/business-leads-queries";
import { BusinessLeadForm } from "@/components/admin/business-lead-form";

export const metadata: Metadata = { title: "Add Lead | Business Leads CRM" };

export default async function NewBusinessLeadPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/business-leads/new");
  if (!hasAnyCapability(currentUser, "manage_leads")) redirect("/admin");

  const statesWithAreas = await getLeadsAccessibleStatesWithAreas(currentUser);

  if (statesWithAreas.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">No regions available</h1>
        <p className="mt-2 text-slate-600">
          You aren&apos;t assigned to any region with CRM access yet. Ask a national admin to grant it.
        </p>
        <Link href="/admin/business-leads" className="mt-4 inline-block text-sm font-semibold text-slate-700">
          &larr; Back to Business Leads CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/business-leads" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
        &larr; Business Leads CRM
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Add Lead</h1>
      <p className="mt-1 text-slate-600">Track a prospective business you&apos;re courting to join the Passport.</p>

      <div className="mt-8">
        <BusinessLeadForm mode="create" statesWithAreas={statesWithAreas} />
      </div>
    </div>
  );
}
