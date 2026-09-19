import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely, and is the only way to reach
// Supabase Auth's admin API (banning a user, for Suspend/Soft Delete).
// Never expose this to the client; import only from Server Actions that have
// already checked currentUser.isNationalAdmin themselves — this client does
// not re-check anything.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
