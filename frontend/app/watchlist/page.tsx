import type { Metadata } from "next";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "My Watchlist",
  description: "Everything on the DSE shares you follow in one page: prices, results, dividends, grade changes, alerts, dates ahead and news.",
  robots: { index: false, follow: false },
};

export default function WatchlistPage() {
  return (
    <>
      <PageHeader
        title={<T en="My watchlist" bn="আমার ওয়াচলিস্ট" />}
        lead={
          <T
            en="Everything on the shares you follow, in one page: prices, results, dividends, grade changes, your alerts, the dates ahead and the news."
            bn="আপনার অনুসরণ করা শেয়ারের সব খবর এক পেজে: দাম, আর্থিক ফল, ডিভিডেন্ড, গ্রেড বদল, আপনার অ্যালার্ট, সামনের তারিখ আর খবর।"
          />
        }
      />
      <WatchlistTable />
    </>
  );
}
