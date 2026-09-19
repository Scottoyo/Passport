import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Just an auth gate — the actual "which business(es) can this user reach"
// logic lives in page.tsx (the picker) and [businessId]/layout.tsx (the
// per-business re-check), same split as /admin's layout.tsx vs.
// /admin/areas/[areaId]/page.tsx.
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</div>;
}
