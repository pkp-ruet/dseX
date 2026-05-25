import type { Metadata } from "next";
import WatchlistTable from "@/components/watchlist/WatchlistTable";

export const metadata: Metadata = {
  title: "My Watchlist — TopStockBD",
  description: "Track your saved DSE stocks with live prices, DSEF scores, and tiers.",
  robots: { index: false, follow: false },
};

export default function WatchlistPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="rank-page-header">
        <h1 className="rank-page-title">My Watchlist</h1>
      </div>
      <WatchlistTable />
    </main>
  );
}
