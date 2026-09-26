import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate, money } from "@/lib/formatters";
import {
  getDailyPickHistory,
  type DailyPickHistoryDay,
  type DailyPickHistoryDayItem,
} from "@/lib/api";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Daily Top 3 Stocks — DSE Picks History",
  description:
    "Every day we pick 3 DSE stocks: 2 trending, 1 top quality. See the full history of every day's picks.",
  keywords:
    "DSE top picks, daily stock picks Bangladesh, Dhaka Stock Exchange best stocks, DSE pick history, BD stock recommendation",
  alternates: { canonical: `${BASE_URL}/top-picks` },
  openGraph: {
    title: "Daily Top 3 Stocks — DSE Picks History | TopStockBD",
    description:
      "Three stock picks a day from the Dhaka Stock Exchange — see the full history.",
    url: `${BASE_URL}/top-picks`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Top 3 Stocks — DSE Picks History",
    description: "See every day's three DSE stock picks.",
  },
};


function PickItemCard({ item }: { item: DailyPickHistoryDayItem }) {
  const sourceColor = item.source === "dsef" ? "var(--positive)" : "var(--primary)";
  const sourceBg = item.source === "dsef"
    ? "color-mix(in srgb, var(--positive) 12%, transparent)"
    : "color-mix(in srgb, var(--primary) 12%, transparent)";

  return (
    <Link
      prefetch={false} href={`/stock/${item.trading_code}`}
      className="block p-3 rounded-xl border border-border bg-bg hover:border-primary/50 transition-colors relative overflow-hidden"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: sourceColor }}
      />
      <div className="pl-1.5">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <p className="text-base sm:text-lg font-extrabold text-text-main leading-tight truncate">
            {item.trading_code}
          </p>
          <span
            className="text-xs sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded-full"
            style={{ background: sourceBg, color: sourceColor }}
          >
            {item.source_label}
          </span>
        </div>
        {item.company_name && (
          <p className="text-xs text-text-muted truncate mb-1.5">
            {item.company_name}
          </p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs sm:text-xs">
          {item.sector && (
            <span className="text-text-muted">{item.sector}</span>
          )}
          {item.ltp_at_pick != null && (
            <span className="text-text-muted">{money(item.ltp_at_pick)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function TopPicksPage() {
  const data = await getDailyPickHistory(60).catch(() => ({ days: [] as DailyPickHistoryDay[] }));
  const days = data.days;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Daily Top Picks", item: `${BASE_URL}/top-picks` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div>
        <PageHeader
          eyebrow="Daily Top Picks"
          title="Three stock picks every day, from the DSE."
          bn="প্রতিদিন তিনটি শেয়ার — দুটি এই সপ্তাহের সবচেয়ে সচল, একটি সবচেয়ে শক্তিশালী কোম্পানি থেকে।"
          lead={
            <>
              Each day we pick 3 stocks: 2 from the most active recent movers (<strong>Trending</strong>),
              and 1 from the strongest companies overall (<strong>Top Quality</strong>). Here&apos;s
              every day&apos;s picks.
            </>
          }
        />

        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-text-muted mb-2">
              No picks tracked yet — we&apos;ll start showing them here from tomorrow onwards.
            </p>
            <Link href="/" className="text-sm text-primary hover:underline">
              ← Back to home
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-5 sm:gap-6">
            {days.map((day) => (
              <li key={day.date}>
                <h2 className="text-sm sm:text-base font-bold text-text-main mb-2 sm:mb-3 px-1">
                  {formatDate(day.date)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {day.picks.map((p) => (
                    <PickItemCard key={`${day.date}-${p.slot}-${p.trading_code}`} item={p} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs sm:text-xs text-text-muted mt-6 leading-relaxed">
          This is research, not investment advice — always do your own homework.
        </p>
      </div>
    </>
  );
}
