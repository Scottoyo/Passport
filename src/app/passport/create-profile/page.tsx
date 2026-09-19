import type { Metadata } from "next";
import { PurchaseSignupForm } from "@/components/purchase-signup-form";

export const metadata: Metadata = { title: "Create Your Profile" };

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function PurchaseCreateProfilePage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <PurchaseSignupForm next={next || "/account"} />
    </div>
  );
}
