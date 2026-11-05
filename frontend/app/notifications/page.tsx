import type { Metadata } from "next";
import NotificationsClient from "@/components/notifications/NotificationsClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Notifications",
  description: "Everything we noticed on your DSE shares in the last 30 days: results, grade changes, warnings, record dates, price alerts and your weekly letter.",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return (
    <div className="page-narrow">
      <PageHeader
        title={<T en="Notifications" bn="নোটিফিকেশন" />}
        lead={
          <T
            en="Everything we noticed on the shares you own or follow in the last 30 days, newest first."
            bn="গত 30 দিনে আপনার কেনা বা অনুসরণ করা শেয়ারে আমরা যা কিছু দেখেছি, নতুনগুলো আগে।"
          />
        }
      />
      <NotificationsClient />
    </div>
  );
}
