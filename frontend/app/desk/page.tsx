import type { Metadata } from "next";
import DeskClient from "@/components/desk/DeskClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Your Desk",
  description: "What happened on your DSE shares after the close, what is coming before the open, and your weekly letter.",
  robots: { index: false, follow: false },
};

export default function DeskPage() {
  return (
    <>
      <PageHeader
        title={<T en="Your Desk" bn="আপনার ডেস্ক" />}
        lead={
          <T
            en="What happened on your shares and what is coming, by time of day. Every notification we send opens here."
            bn="আপনার শেয়ারে কী ঘটেছে আর সামনে কী আসছে, দিনের সময় ধরে। আমাদের প্রতিটি নোটিফিকেশন এখানে খোলে।"
          />
        }
      />
      <DeskClient />
    </>
  );
}
