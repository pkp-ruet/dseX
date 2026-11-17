import type { Metadata } from "next";
import ForYouClient from "@/components/for-you/ForYouClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Based on your shares",
  description:
    "DSE companies to watch next, picked from the shares you own, follow and read about, each with why it fits you.",
  alternates: { canonical: "/for-you" },
  robots: { index: false, follow: false },
};

/** "Based on your shares" (was Discover at /discover until 2026-11-18). */
export default function ForYouPage() {
  return (
    <>
      <PageHeader
        title={<T en="Based on your shares" bn="আপনার শেয়ার দেখে বাছাই" />}
        lead={
          <T
            en="Companies to watch next, picked from the shares you own, follow and read about. Each one says why."
            bn="পরে নজরে রাখার মতো কোম্পানি, বাছাই হয়েছে আপনার কেনা, ফলো করা আর পড়ে দেখা শেয়ার দেখে। প্রতিটির সাথে বলা আছে কেন।"
          />
        }
      />
      <ForYouClient />
    </>
  );
}
