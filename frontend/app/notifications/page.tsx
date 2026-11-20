import type { Metadata } from "next";
import NotificationsClient from "@/components/notifications/NotificationsClient";
import AlertsClient from "@/components/alerts/AlertsClient";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Updates",
  description: "Everything on your DSE shares in one place: the dates coming up, what we noticed in the last 30 days, and your price alerts.",
  robots: { index: false, follow: false },
};

/**
 * Updates (2026-11-20, the app map): THE one feed of news on the reader's
 * shares. The dates coming up (from the watchlist's old "Coming up" card),
 * what we noticed in the last 30 days, then the reader's price alerts (the
 * old /alerts page, which 301s to `#alerts`). Same URL as Notifications, so
 * every push and the navbar bell still land here.
 */
export default function UpdatesPage() {
  return (
    <div className="page-narrow">
      <PageHeader
        title={<T en="Updates" bn="আপডেট" />}
        lead={
          <T
            en="The dates coming up and everything we noticed on the shares you own or follow, newest first."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ারের সামনের তারিখ, আর সেগুলোতে আমরা যা দেখেছি, নতুনগুলো আগে।"
          />
        }
      />
      <NotificationsClient />
      <section id="alerts" className="nt-alerts stock-anchor" aria-labelledby="nt-alerts">
        <SectionHeader
          id="nt-alerts"
          title={<T en="Your price alerts" bn="আপনার প্রাইস অ্যালার্ট" />}
          lead={
            <T
              en="We tell you on the day a share reaches your price. Set one from any share's page."
              bn="শেয়ারের দাম আপনার ঠিক করা দামে পৌঁছালে সেদিনই জানাই। যেকোনো শেয়ারের পেজ থেকে অ্যালার্ট রাখুন।"
            />
          }
        />
        <AlertsClient />
      </section>
    </div>
  );
}
