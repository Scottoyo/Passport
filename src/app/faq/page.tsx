import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">Frequently asked questions</h1>
      <div className="mt-8">
        <FaqList />
      </div>
    </div>
  );
}
