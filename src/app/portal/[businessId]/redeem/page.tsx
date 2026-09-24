import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess } from "@/lib/portal-queries";
import { ManualRedemptionFlow } from "@/components/business/manual-redemption-flow";
import { cardClasses } from "@/lib/ui-classes";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalRedeemPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">Manual Passport Redemption</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Use this option when a customer is unable to redeem from their device.
      </p>

      <div className={`mt-6 max-w-xl p-6 ${cardClasses()}`}>
        <ManualRedemptionFlow businessId={businessId} businessName={business.name} />
      </div>
    </div>
  );
}
