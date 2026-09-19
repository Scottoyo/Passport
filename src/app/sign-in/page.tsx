import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInFormWithSuspense } from "@/components/sign-in-form";
import { getPostSignInRedirect } from "@/app/auth/actions";

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next || (await getPostSignInRedirect()));

  return <SignInFormWithSuspense />;
}
