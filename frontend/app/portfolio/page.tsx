import type { Metadata } from "next";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import ViewAnalysisButton from "@/components/portfolio/ViewAnalysisButton";
import Bn from "@/components/i18n/Bn";

export const metadata: Metadata = {
  title: "My Portfolio — TopStockBD",
  description: "Track your DSE stock portfolio with live P&L, current market value, and gain/loss calculations.",
  robots: { index: false, follow: false },
};

export default function PortfolioPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="rank-page-header">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="rank-page-title">My Portfolio</h1>
          <ViewAnalysisButton />
        </div>
        <Bn className="page-h1-bn">আপনার কেনা শেয়ারগুলোর লাভ-ক্ষতি, ডিভিডেন্ড আর পরামর্শ — প্রতিদিন।</Bn>
      </div>
      <PortfolioClient />
    </main>
  );
}
