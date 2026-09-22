import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };

const FAQS = [
  {
    question: "How does the Passport work?",
    answer:
      "Each region has its own Passport. Buy the one for the region you're visiting, then show it at checkout at any participating business in that region to redeem their offer.",
  },
  {
    question: "Is my Passport valid in other regions?",
    answer:
      "No - a Passport only unlocks offers in the region it was purchased for, even other regions in the same state. Visiting more than one region? You'll need a separate Passport for each.",
  },
  {
    question: "How many people does a Passport cover?",
    answer:
      "It depends on the product you choose - some cover just one person, others cover a group. The exact number is shown on the purchase page before you buy.",
  },
  {
    question: "How long is a Passport valid for?",
    answer:
      "Each Passport has a set validity window shown at purchase (commonly a year). Your account page shows the exact expiration date for each Passport you own.",
  },
  {
    question: "How do I redeem an offer?",
    answer:
      "Show your digital Passport at checkout at any participating business. Staff will check you in and apply the offer.",
  },
  {
    question: "I'm a business owner - how do I get listed?",
    answer:
      "Reach out through our business registration process to get your business reviewed and added to the Passport.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">Frequently asked questions</h1>
      <div className="mt-8 space-y-8">
        {FAQS.map((item) => (
          <div key={item.question}>
            <h2 className="font-semibold text-ink">{item.question}</h2>
            <p className="mt-1 text-sm text-ink-muted">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
