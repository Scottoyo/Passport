"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavorite(businessId: string, currentPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(currentPath)}`);

  const { data: existing } = await supabase
    .from("business_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("business_favorites").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("business_favorites")
      .insert({ user_id: user.id, business_id: businessId });
    if (error) throw new Error(error.message);
  }

  revalidatePath(currentPath);
}

export async function redeemOffer(offerId: string, code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_offer", {
    target_offer_id: offerId,
    submitted_code: code.trim(),
  });
  if (error) return { error: error.message };
  const result = data as { success: boolean; error?: string };
  if (!result.success) return { error: result.error ?? "Redemption failed." };
  return { error: null };
}
