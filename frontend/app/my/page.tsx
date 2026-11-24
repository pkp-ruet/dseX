import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import { T } from "@/components/i18n/T";

// Personal: noindex, no sitemap entry (SEO rule 3 — only indexable URLs).
export const metadata: Metadata = {
  title: "My shares",
  description: "Every DSE share you own or watch, in one list: today's price, your money, what's new on each, and what you can do with it.",
  robots: { index: false, follow: false },
};

/**
 * My shares (2026-11-25, step 3 of the simplify review — the user chose this
 * page for the one list): every share the reader owns (main portfolio) and
 * watches, All · I own · I watch, one sheet for every row, and every action
 * (add, bought more, sold, fix, watch, stop watching). The watchlist page
 * folded in (/watchlist, /watch-rules and /alerts 301 here); /portfolio keeps
 * the money, the check and the details. It was a page of doors (2026-11-20).
 */
export default function MySharesPage() {
  return (
    <>
      <PageHeader
        title={<T en="My shares" bn="আমার শেয়ার" />}
        lead={
          <T
            en="Every share you own or watch, in one list. Tap a share for its whole story and what you can do with it."
            bn="আপনার কেনা আর নজরে রাখা সব শেয়ার, এক তালিকায়। কোনো শেয়ারে চাপুন, পুরো কথা আর যা যা করতে পারেন দেখুন।"
          />
        }
      />
      <PortfolioClient view="shares" />
    </>
  );
}
