import type { Metadata } from "next";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import ViewAnalysisButton from "@/components/portfolio/ViewAnalysisButton";
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
      <PageHeader
        title={<T en="My portfolio" bn="আমার পোর্টফোলিও" />}
        lead={
          <T
            en="Your profit or loss, dividends and next steps on the shares you own, updated every day."
            bn="আপনার কেনা শেয়ারের মুনাফা বা লোকসান, ডিভিডেন্ড আর পরবর্তী পদক্ষেপ, প্রতিদিন হালনাগাদ।"
          />
        }
        actions={<ViewAnalysisButton />}
      />
      <PortfolioClient />
    </>
  );
}
