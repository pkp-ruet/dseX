import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import MySharesClient from "@/components/my-shares/MySharesClient";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "My shares",
  description: "What's new and what's coming on every DSE share you own or watch: results, dividends, warnings, record dates and today's price.",
  robots: { index: false, follow: false },
};

/**
 * My shares (rebuilt 2026-11-25 — user: "its main job is to give updates on
 * watched and owned shares … both type shares will behave here identical";
 * mockup https://claude.ai/artifact/5rwddQNhbPqbY6YwNsiP89). One strong
 * button to the portfolio (the money lives there), then every share the
 * reader owns or watches in the same row, grouped as New · Coming up ·
 * Nothing new. The watchlist page folded in earlier the same day
 * (/watchlist, /watch-rules and /alerts 301 here).
 */
export default function MySharesPage() {
  return (
    <>
      <PageHeader
        title={<T en="My shares" bn="আমার শেয়ার" />}
        lead={
          <T
            en="What's happening with the shares you own and watch."
            bn="আপনার কেনা আর নজরে রাখা শেয়ারগুলোতে কী হচ্ছে।"
          />
        }
      />
      <MySharesClient />
    </>
  );
}
