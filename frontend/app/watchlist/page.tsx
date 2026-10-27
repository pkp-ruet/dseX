import type { Metadata } from "next";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Track your saved DSE stocks with live prices, scores, and tiers.",
  robots: { index: false, follow: false },
};

export default function WatchlistPage() {
  return (
    <>
      <PageHeader
        title={<T en="My watchlist" bn="আমার ওয়াচলিস্ট" />}
        lead={
          <T
            en="The shares you follow in one place, with their prices, scores and news."
            bn="আপনি যেসব শেয়ার অনুসরণ করেন, তাদের দাম, স্কোর আর খবর এক জায়গায়।"
          />
        }
      />
      <WatchlistTable />
    </>
  );
}
