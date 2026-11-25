import type { Metadata } from "next";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "My Portfolio",
  description: "Track your DSE stock portfolio with live P&L, current market value, and gain/loss calculations.",
  robots: { index: false, follow: false },
};

export default function PortfolioPage() {
  return (
    <>
      {/* A light header (no rule, one short line): the money card right under
          it is the page's real top. "See your plan" left the header 2026-11-25
          — "What to do" sits one card below the money. */}
      <PageHeader
        className="pf-page-head"
        title={<T en="My portfolio" bn="আমার পোর্টফোলিও" />}
        lead={
          <T
            en="Your money, how it is doing, and what to do next. Checked after every close."
            bn="আপনার টাকা, কেমন চলছে, আর এরপর কী করবেন। প্রতিদিন বাজার বন্ধের পর যাচাই করা।"
          />
        }
      />
      <PortfolioClient />
    </>
  );
}
