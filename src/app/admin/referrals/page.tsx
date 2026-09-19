import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getAdminScopedAreaIds } from "@/lib/admin-scope";
import { getReferralReport } from "@/lib/admin-queries";
import { ReferralReportTable } from "@/components/admin/referral-report-table";

export default async function ReferralsAdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin/referrals");

  const isNationalAdmin = currentUser.isNationalAdmin;
  if (!isNationalAdmin && currentUser.stateAssignments.length === 0 && currentUser.areaAssignments.length === 0) {
    redirect("/admin");
  }

  const areaIds = await getAdminScopedAreaIds(currentUser);
  const rows = await getReferralReport("profile", areaIds);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Referral Program</h1>
      <p className="mt-1 text-slate-600">
        Every passport holder whose referral code has generated a purchase within your scope.
      </p>

      <div className="mt-6">
        <ReferralReportTable kind="profile" rows={rows} />
      </div>
    </div>
  );
}
