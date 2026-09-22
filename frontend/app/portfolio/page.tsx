import type { Metadata } from "next";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import ViewAnalysisButton from "@/components/portfolio/ViewAnalysisButton";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "My Portfolio",
  description: "Track your DSE stock portfolio with live P&L, current market value, and gain/loss calculations.",
  robots: { index: false, follow: false },
};

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        title="My Portfolio"
        bn="আপনার কেনা শেয়ারগুলোর লাভ-ক্ষতি, ডিভিডেন্ড আর পরামর্শ — প্রতিদিন।"
        actions={<ViewAnalysisButton />}
      />
      <PortfolioClient />
    </>
  );
}
