#!/usr/bin/env node
// One-off operational script: grant national-admin access to a user who has
// already signed in at least once (so a profiles row exists for them).
//
// National admin is deliberately impossible to self-grant through the app —
// there's no UI for it, and RLS on national_admins only allows an existing
// national admin to write that table. The very first admin has to be
// bootstrapped outside RLS, with the service role key, which is why this is
// a script and not an admin page.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
//     node scripts/grant-national-admin.mjs someone@example.com

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/grant-national-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("email", email)
  .maybeSingle();

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

if (!profile) {
  console.error(
    `No profile found for ${email}. They need to sign in to the site at least once first.`
  );
  process.exit(1);
}

const { error: insertError } = await supabase
  .from("national_admins")
  .insert({ user_id: profile.id });

if (insertError) {
  console.error(insertError.message);
  process.exit(1);
}

console.log(`Granted national admin to ${email}.`);
