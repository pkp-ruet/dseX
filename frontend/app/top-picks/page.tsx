import type { Metadata } from "next";
import Link from "next/link";
import { getDailyPickHistory, type DailyPickHistoryItem } from "@/lib/api";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Daily Top Stock — DSE Picks History | TopStockBD",
  description:
    "Every day we pick one DSE stock that scores well and looks promising. See the full history of past picks and how each one performed the next trading day.",
  keywords:
    "DSE top pick, daily stock pick Bangladesh, Dhaka Stock Exchange best stock, DSE pick history, BD stock recommendation",
  alternates: { canonical: `${BASE_URL}/top-picks` },
  openGraph: {
    title: "Daily Top Stock — DSE Picks History | TopStockBD",
    description:
      "One stock pick a day from the Dhaka Stock Exchange — see the history and how each pick performed.",
    url: `${BASE_URL}/top-picks`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Top Stock — DSE Picks History",
    description: "See every daily DSE stock pick and its next-day performance.",
  },
};

function gradeOf(score: number | null): { letter: string; color: string } {
  if (score == null) return { letter: "?", color: "#94A3B8" };
  if (score >= 80) return { letter: "A", color: "#34D399" };
  if (score >= 70) return { letter: "B", color: "#4ADE80" };
  if (score >= 60) return { letter: "C", color: "#60A5FA" };
  if (score >= 50) return { letter: "D", color: "#FBBF24" };
  return { letter: "F", color: "#F87171" };
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function chgColor(v: number | null): string {
  if (v == null) return "var(--text-muted)";
  if (v > 0) return "#34D399";
  if (v < 0) return "#F87171";
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

function summarize(items: DailyPickHistoryItem[]) {
  const tracked = items.filter((i) => i.next_day_return_pct != null);
  const wins = tracked.filter((i) => (i.next_day_return_pct ?? 0) > 0).length;
  const total = tracked.length;
  const avg = total ? tracked.reduce((s, i) => s + (i.next_day_return_pct ?? 0), 0) / total : 0;
  return { wins, total, avg };
}

export default async function TopPicksPage() {
  const data = await getDailyPickHistory(60).catch(() => ({ items: [] as DailyPickHistoryItem[] }));
  const items = data.items;
  const { wins, total, avg } = summarize(items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Daily Top Stock", item: `${BASE_URL}/top-picks` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#F97316" }}>
            ★ Daily Top Stock
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text)] leading-tight mb-2">
            Every day, one stock pick from the DSE.
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            We look at every Dhaka Stock Exchange company, score them on profits, debt, business
            strength, fair price, and dividends — then pick one that stands out today. Here&apos;s
            the full history and how each pick did on the next trading day.
          </p>
        </header>

        {/* Summary stats */}
        {total > 0 && (
          <section className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Picks tracked
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-[var(--text)]">{total}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Went up next day
              </p>
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color: "#34D399" }}>
                {wins} <span className="text-sm sm:text-base text-[var(--text-muted)] font-semibold">/ {total}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Average next day
              </p>
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color: chgColor(avg) }}>
                {fmtPct(avg)}
              </p>
            </div>
          </section>
        )}

        {/* History list */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)] mb-2">
              No picks tracked yet — we&apos;ll start showing them here from tomorrow onwards.
            </p>
            <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
              ← Back to home
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5 sm:gap-3">
            {items.map((item) => {
              const grade = gradeOf(item.score);
              return (
                <li
                  key={`${item.date}-${item.trading_code}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"
                >
                  <Link
                    href={`/stock/${item.trading_code}`}
                    className="flex items-start gap-3 sm:gap-4"
                  >
                    <div
                      className="flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] aspect-square rounded-xl border-2 shrink-0"
                      style={{
                        borderColor: grade.color,
                        background: `${grade.color}1f`,
                        color: grade.color,
                      }}
                    >
                      <span className="text-2xl sm:text-3xl font-extrabold leading-none">{grade.letter}</span>
                      <span className="text-[8px] uppercase tracking-wider mt-0.5 font-bold">
                        {Math.round(item.score ?? 0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <p className="text-sm sm:text-base font-extrabold text-[var(--text)] leading-tight truncate">
                          {item.trading_code}
                        </p>
                        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {fmtDate(item.date)}
                        </span>
                      </div>
                      {item.company_name && (
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate mb-1">
                          {item.company_name}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs">
                        {item.sector && (
                          <span className="text-[var(--text-muted)]">{item.sector}</span>
                        )}
                        {item.ltp_at_pick != null && (
                          <span className="text-[var(--text-muted)]">
                            Picked at ৳{item.ltp_at_pick.toFixed(2)}
                          </span>
                        )}
                        <span
                          className="font-bold"
                          style={{ color: chgColor(item.next_day_return_pct) }}
                        >
                          Next day: {fmtPct(item.next_day_return_pct)}
                        </span>
                      </div>
                      {item.reasons.length > 0 && (
                        <p className="text-[11px] sm:text-xs text-[var(--text)] leading-relaxed mt-1.5 line-clamp-2">
                          {item.reasons[0]}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-6 leading-relaxed">
          Past performance does not guarantee future results. This is research, not investment advice — always do your own homework.
        </p>
      </div>
    </>
  );
}
