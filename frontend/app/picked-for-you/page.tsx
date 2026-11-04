import type { Metadata } from "next";
import PicksClient from "@/components/picks/PicksClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Picked for you",
  description:
    "DSE stocks that pass every one of our checks today, matched to the shares you own and follow, each with the figures behind it.",
  alternates: { canonical: "/picked-for-you" },
  robots: { index: false, follow: false },
};

export default function PickedForYouPage() {
  return (
    <>
      <PageHeader
        eyebrow={<T en="Premium" bn="প্রিমিয়াম" />}
        title={<T en="Picked for you" bn="আপনার জন্য বাছাই" />}
        lead={
          <T
            en="Stocks that pass every one of our checks today, matched to the shares you own and follow. Each comes with the figures behind it and one honest thing to watch."
            bn="আজ আমাদের সব যাচাই পার হওয়া শেয়ার, আপনার কেনা ও ফলো করা শেয়ারের সাথে মিলিয়ে। প্রতিটির সাথে আছে এর পেছনের সংখ্যা আর খেয়াল রাখার মতো একটি বিষয়।"
          />
        }
      />
      <PicksClient />
    </>
  );
}
