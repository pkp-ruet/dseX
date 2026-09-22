import type { Metadata } from "next";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Track your saved DSE stocks with live prices, scores, and tiers.",
  robots: { index: false, follow: false },
};

export default function WatchlistPage() {
  return (
    <>
      <PageHeader
        title="My Watchlist"
        bn="আপনার পছন্দের শেয়ারগুলো এক জায়গায় — দাম, স্কোর আর খবর।"
      />
      <WatchlistTable />
    </>
  );
}
