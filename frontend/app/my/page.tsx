import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import MyPlace from "@/components/places/MyPlace";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "My shares",
  description: "Your portfolio, the shares you follow, the updates on them and companies like yours, in one place.",
  robots: { index: false, follow: false },
};

export default function MySharesPage() {
  return (
    <div className="page-narrow pl-page">
      <PageHeader
        title={<T en="My shares" bn="আমার শেয়ার" />}
        lead={<T en="Your money, the shares you follow and what's new on them." bn="আপনার টাকা, অনুসরণ করা শেয়ার আর সেগুলোর নতুন খবর।" />}
      />
      <MyPlace />
    </div>
  );
}
