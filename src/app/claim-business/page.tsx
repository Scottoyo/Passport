import { createClient } from "@/lib/supabase/server";
import { ClaimBusinessPanel } from "@/components/claim-business-panel";
import { acceptBusinessOwnershipInvitation } from "./actions";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ClaimBusinessPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className={`p-8 text-center ${cardClasses()}`}>
          <h1 className="font-display text-xl font-bold text-ink">Invalid link</h1>
          <p className="mt-2 text-sm text-ink-muted">This invitation link is missing its token.</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <ClaimBusinessPanel token={token} />
      </div>
    );
  }

  const { data, error } = await supabase.rpc("get_business_invitation_preview", { raw_token: token });
  const result = data as { success: boolean; error?: string; business_name?: string; email?: string } | null;

  if (error || !result?.success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className={`p-8 text-center ${cardClasses()}`}>
          <h1 className="font-display text-xl font-bold text-ink">Can&apos;t accept this invitation</h1>
          <p className="mt-2 text-sm text-ink-muted">{result?.error ?? error?.message ?? "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <div className={`p-8 ${cardClasses()}`}>
        <h1 className="font-display text-xl font-bold text-ink">You&apos;ve been invited</h1>
        <p className="mt-2 text-sm text-ink-muted">
          You&apos;ve been invited to manage <strong>{result.business_name}</strong> on Local Perks
          Passport, sent to <strong>{result.email}</strong>.
        </p>
        <form action={acceptBusinessOwnershipInvitation.bind(null, token)} className="mt-6">
          <button type="submit" className={`w-full ${buttonClasses("primary")}`}>
            Accept and manage this business
          </button>
        </form>
      </div>
    </div>
  );
}
