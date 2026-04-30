import type { Metadata } from "next";
import PortfolioClient from "@/components/portfolio/PortfolioClient";

export const metadata: Metadata = {
  title: "My Portfolio — TopStockBD",
  description: "Track your DSE stock portfolio with live P&L, current market value, and gain/loss calculations.",
  robots: { index: false, follow: false },
};

export default function PortfolioPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="rank-page-header">
        <p className="rank-page-eyebrow">// PERSONAL</p>
        <h1 className="rank-page-title">My Portfolio</h1>
      </div>
      <PortfolioClient />
    </main>
  );
}
