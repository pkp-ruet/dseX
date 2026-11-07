import type { Metadata } from "next";
import PicksClient from "@/components/picks/PicksClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Discover",
  description:
    "Strong DSE companies to explore and read about, matched to the shares you own and follow, each with why it fits you and the figures behind it.",
  alternates: { canonical: "/discover" },
  robots: { index: false, follow: false },
};

export default function DiscoverPage() {
  return (
    <>
      <PageHeader
        title={<T en="Discover" bn="খুঁজে দেখুন" />}
        lead={
          <T
            en="Strong companies you don't own yet, matched to your shares. To read about and get to know."
            bn="আপনার শেয়ারের সাথে মিলিয়ে এমন শক্তিশালী কোম্পানি, যা এখনো আপনার কাছে নেই। পড়ে দেখা আর চেনার জন্য।"
          />
        }
      />
      <PicksClient />
    </>
  );
}
