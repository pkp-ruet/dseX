import type { Metadata } from "next";
import Link from "next/link";
import {
  getDailyPickHistory,
  type DailyPickHistoryDay,
  type DailyPickHistoryDayItem,
} from "@/lib/api";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Daily Top 3 Stocks — DSE Picks History | TopStockBD",
  description:
    "Every day we pick 3 DSE stocks: 2 trending, 1 top quality. See the full history and how each pick performed the next trading day.",
  keywords:
    "DSE top picks, daily stock picks Bangladesh, Dhaka Stock Exchange best stocks, DSE pick history, BD stock recommendation",
  alternates: { canonical: `${BASE_URL}/top-picks` },
  openGraph: {
    title: "Daily Top 3 Stocks — DSE Picks History | TopStockBD",
    description:
      "Three stock picks a day from the Dhaka Stock Exchange — see the history and how each pick performed.",
    url: `${BASE_URL}/top-picks`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Top 3 Stocks — DSE Picks History",
    description: "See every day's three DSE stock picks and their next-day performance.",
  },
};

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function chgColor(v: number | null): string {
  if (v == null) return "var(--text-muted)";
  if (v > 0) return "var(--positive)";
  if (v < 0) return "var(--negative)";
  return "var(--text-muted)";
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function summarize(days: DailyPickHistoryDay[]) {
  const all: DailyPickHistoryDayItem[] = [];
  for (const day of days) all.push(...day.picks);
  const tracked = all.filter((i) => i.next_day_return_pct != null);
  const wins = tracked.filter((i) => (i.next_day_return_pct ?? 0) > 0).length;
  const total = tracked.length;
  const avg = total ? tracked.reduce((s, i) => s + (i.next_day_return_pct ?? 0), 0) / total : 0;
  return { wins, total, avg };
}

function PickItemCard({ item }: { item: DailyPickHistoryDayItem }) {
  const sourceColor = item.source === "dsef" ? "var(--positive)" : "var(--primary)";
  const sourceBg = item.source === "dsef"
    ? "color-mix(in srgb, var(--positive) 12%, transparent)"
    : "color-mix(in srgb, var(--primary) 12%, transparent)";

  return (
    <Link
      prefetch={false} href={`/stock/${item.trading_code}`}
      className="block p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--primary)]/50 transition-colors relative overflow-hidden"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: sourceColor }}
      />
      <div className="pl-1.5">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <p className="text-base sm:text-lg font-extrabold text-[var(--text)] leading-tight truncate">
            {item.trading_code}
          </p>
          <span
            className="text-[11px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded-full"
            style={{ background: sourceBg, color: sourceColor }}
          >
            {item.source_label}
          </span>
        </div>
        {item.company_name && (
          <p className="text-xs text-[var(--text-muted)] truncate mb-1.5">
            {item.company_name}
          </p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
          {item.sector && (
            <span className="text-[var(--text-muted)]">{item.sector}</span>
          )}
          {item.ltp_at_pick != null && (
            <span className="text-[var(--text-muted)]">৳{item.ltp_at_pick.toFixed(2)}</span>
          )}
          <span className="font-bold" style={{ color: chgColor(item.next_day_return_pct) }}>
            Next day: {fmtPct(item.next_day_return_pct)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function TopPicksPage() {
  const data = await getDailyPickHistory(60).catch(() => ({ days: [] as DailyPickHistoryDay[] }));
  const days = data.days;
  const { wins, total, avg } = summarize(days);

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

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <p className="text-[11px] sm:text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#F97316" }}>
            ★ Daily Top Picks
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text)] leading-tight mb-2">
            Three stock picks every day, from the DSE.
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            Each day we pick 3 stocks: 2 from the most active recent movers
            (<span className="font-semibold text-[var(--text)]">Trending</span>),
            and 1 from the strongest companies overall
            (<span className="font-semibold text-[var(--text)]">Top Quality</span>).
            Here&apos;s the history with how each pick did the next trading day.
          </p>
        </header>

        {total > 0 && (
          <section className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Picks tracked
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-[var(--text)]">{total}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Went up next day
              </p>
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color: "var(--positive)" }}>
                {wins} <span className="text-sm sm:text-base text-[var(--text-muted)] font-semibold">/ {total}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Average next day
              </p>
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color: chgColor(avg) }}>
                {fmtPct(avg)}
              </p>
            </div>
          </section>
        )}

        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)] mb-2">
              No picks tracked yet — we&apos;ll start showing them here from tomorrow onwards.
            </p>
            <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
              ← Back to home
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-5 sm:gap-6">
            {days.map((day) => (
              <li key={day.date}>
                <h2 className="text-sm sm:text-base font-bold text-[var(--text)] mb-2 sm:mb-3 px-1">
                  {fmtDate(day.date)}
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

        <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-6 leading-relaxed">
          Past performance does not guarantee future results. This is research, not investment advice — always do your own homework.
        </p>
      </div>
    </>
  );
}
