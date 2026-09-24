"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Mirrors only the sign-up half of registerBusiness (src/app/register-business/actions.ts)
// - no business insert, this is purely "create an account so you can accept
// an invitation you already received by email."
export async function signUpForClaim(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!firstName || !lastName || !email) {
    return { error: "First name, last name, and email are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Couldn't create your account. Please try again." };

  return { error: null, signedIn: Boolean(data.session) };
}

export async function acceptBusinessOwnershipInvitation(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_business_ownership", { raw_token: token });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; error?: string; business_id?: string };
  if (!result.success) throw new Error(result.error ?? "Couldn't accept this invitation.");
  redirect(`/portal/${result.business_id}/profile`);
}
