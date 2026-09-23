"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBusinessWelcomeEmail } from "@/lib/email/send-business-welcome";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function registerBusiness(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const workEmail = String(formData.get("work_email") ?? "").trim().toLowerCase();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const businessName = String(formData.get("business_name") ?? "").trim();
  const businessPhone = String(formData.get("business_phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "");

  if (!firstName || !lastName || !workEmail) {
    return { error: "First name, last name, and work email are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }
  if (!businessName || !areaId) {
    return { error: "Business name and region are required." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: workEmail,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }
  if (!signUpData.user) {
    return { error: "Couldn't create your account. Please try again." };
  }

  // Session is only set if the Supabase project doesn't require email
  // confirmation. Either way, the account and business submission exist —
  // if there's no session yet, they'll need to confirm their email and
  // sign in before they can check on their application.
  const signedIn = Boolean(signUpData.session);

  if (contactPhone) {
    await supabase.from("profiles").update({ phone: contactPhone }).eq("id", signUpData.user.id);
  }

  // The form only collects a Passport region (area_id) - the business's
  // mailing-address state code is derived from that region's own state
  // rather than asked for a second time as free text, since a region
  // always belongs to exactly one state.
  const { data: area } = await supabase
    .from("passport_areas")
    .select("state_id, name")
    .eq("id", areaId)
    .maybeSingle();
  if (!area) {
    return { error: "Please select a valid region." };
  }
  const { data: state } = await supabase
    .from("states")
    .select("abbreviation")
    .eq("id", area.state_id)
    .maybeSingle();
  const stateCode = state?.abbreviation ?? null;

  const { data: newBusiness, error: businessError } = await supabase
    .from("businesses")
    .insert({
      passport_area_id: areaId,
      name: businessName,
      slug: slugify(businessName),
      phone: businessPhone || null,
      website_url: website || null,
      address_line1: address || null,
      city: city || null,
      state_code: stateCode || null,
      postal_code: zip || null,
      created_by: signUpData.user.id,
    })
    .select("id, approval_status")
    .single();

  if (businessError) {
    return { error: businessError.message };
  }

  // Fire-and-forget via after() - see src/app/passport/actions.ts for the
  // same reasoning (serverless freeze risk with a bare un-awaited call). A
  // failed welcome email must never fail a successful registration.
  // (ownerUserId captured as a local const - TS's null-narrowing on
  // signUpData.user doesn't survive into a closure passed to after().)
  const ownerUserId = signUpData.user.id;
  after(() =>
    sendBusinessWelcomeEmail({
      businessId: newBusiness.id,
      approvalStatus: newBusiness.approval_status,
      ownerUserId,
      ownerEmail: workEmail,
      ownerFirstName: firstName || null,
      businessName,
      areaId,
    }).catch((e) => console.error("business welcome email failed", e))
  );

  return { error: null, signedIn };
}
