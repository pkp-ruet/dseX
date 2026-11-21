import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import AlertsClient from "@/components/alerts/AlertsClient";
import WatchRulesPage from "@/components/watch-rules/WatchRulesPage";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "Watch rules",
  description: "Choose what TopStockBD tells you about each of your DSE shares, and manage your price alerts.",
  robots: { index: false, follow: false },
};

/**
 * Watch rules (2026-11-22): every rule the reader set, share by share, the
 * shares they own or follow with none yet, and their price alerts (moved here
 * from Updates; /alerts 301s to `#alerts`). Rules are set in the same sheet
 * as on the stock page (`WatchRulesHost`).
 */
export default function WatchRulesRoute() {
  return (
    <div className="page-narrow">
      <PageHeader
        title={<T en="Watch rules" bn="নজরের নিয়ম" />}
        lead={
          <T
            en="Choose what we tell you about each share. We check every rule after the market closes."
            bn="প্রতিটি শেয়ার নিয়ে কী জানাব তা আপনি বেছে নিন। বাজার বন্ধের পর আমরা প্রতিটি নিয়ম দেখি।"
          />
        }
      />
      <WatchRulesPage />
      <section id="alerts" className="wrp-section stock-anchor" aria-labelledby="wrp-alerts">
        <SectionHeader
          id="wrp-alerts"
          title={<T en="Your price alerts" bn="আপনার প্রাইস অ্যালার্ট" />}
          lead={
            <T
              en="We tell you on the day a share reaches your price. Set one from any share's page. Each armed alert counts as a rule."
              bn="শেয়ারের দাম আপনার ঠিক করা দামে পৌঁছালে সেদিনই জানাই। যেকোনো শেয়ারের পেজ থেকে অ্যালার্ট রাখুন। চালু প্রতিটি অ্যালার্ট একটি নিয়ম হিসেবে গোনা হয়।"
            />
          }
        />
        <AlertsClient shared />
      </section>
    </div>
  );
}
