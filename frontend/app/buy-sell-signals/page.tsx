import type { Metadata } from "next";
import { flattenTiers, getDailyTips, getScores, type ScoreItem } from "@/lib/api";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";
import SectionHeader from "@/components/ui/SectionHeader";
import SignalsExplorer from "@/components/signals/SignalsExplorer";
import { formatDate } from "@/lib/formatters";
import Bn from "@/components/i18n/Bn";
import ErrorState from "@/components/ui/ErrorState";
import SignalChip from "@/components/ui/SignalChip";
import PageHeader from "@/components/ui/PageHeader";
import HubLinks from "@/components/layout/HubLinks";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const TITLE = "DSE Buy Signals — What to Buy Today";
const DESC =
  "Daily Buy and Strong Buy signals for Dhaka Stock Exchange (DSE) stocks — which shares look worth buying right now, each with a plain-English reason — plus today's stock tips. Strong Buy flags the cheapest, highest-conviction picks.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "DSE buy signal",
    "which stock to buy in DSE",
    "DSE stock signals",
    "strong buy DSE",
    "DSE share buy recommendation",
    "best stocks to buy DSE",
    "high conviction stocks DSE",
    "Dhaka Stock Exchange signals",
    "DSE stocks to buy today",
    "DSE stock tips",
    "daily stock tips Bangladesh",
    "DSE top picks today",
  ],
  alternates: { canonical: "/buy-sell-signals" },
  openGraph: {
    title: "DSE Buy Signals",
    description: DESC,
    url: `${BASE_URL}/buy-sell-signals`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Buy Signals",
    description: DESC,
  },
};

export default async function BuySellSignalsPage() {
  // The daily tips live here since 2026-10-25 (/daily-tips and /top-picks
  // 301 to this page) — fetched beside the scores, not after them.
  const [scores, tipsData] = await Promise.all([
    getScores().catch(() => null),
    getDailyTips().catch(() => null),
  ]);
  const tips = tipsData?.tips ?? [];

  if (!scores) return <ErrorState title="Buy signals didn't load" reload />;

  const all = flattenTiers(scores);
  // Buys only — Strong Buys first, then by fundamental score. The explorer
  // re-sorts on interaction, but this keeps the SSR order sensible. (Sell is
  // computed by the backend but not shown in the UI yet.)
  const buy: ScoreItem[] = all
    .filter((i) => i.signal?.signal === "buy")
    .sort(
      (a, b) =>
        Number(b.signal?.strength === "strong") - Number(a.signal?.strength === "strong") ||
        (b.score ?? -1) - (a.score ?? -1),
    );
  const strongCount = buy.filter((i) => i.signal?.strength === "strong").length;

  const sectors = Array.from(
    new Set(buy.map((i) => i.sector).filter((s): s is string => Boolean(s))),
  ).sort((a, b) => a.localeCompare(b));

  const updated = scores.computed_at ? formatDate(scores.computed_at) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/buy-sell-signals`,
        url: `${BASE_URL}/buy-sell-signals`,
        name: TITLE,
        description: DESC,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
        // Past the free head the list is Premium (screen-only lock).
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Buy Signals",
            item: `${BASE_URL}/buy-sell-signals`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>
        <PageHeader
          title="Buy signals"
          bn="প্রতিদিন কেনার মতো শেয়ার — ভালো কোম্পানি, ঠিকঠাক দামে। জোরালো কারণ না থাকলে শেয়ারটি এখানে আসে না।"
          lead="Good companies at a sensible price, checked every trading day. When there is no clear reason to buy, a stock simply doesn't appear here."
        />

        {/* Summary: the numbers first, the rule folded underneath. */}
        <section aria-label="Today's buy signals in numbers" className="soft-card sg-summary">
          <div className="sg-summary-grid">
            <SummaryCell value={buy.length} label="Buy signals today" tone="positive" />
            <SummaryCell value={strongCount} label="Strong buys" note="The cheapest of the lot" />
            <SummaryCell value={sectors.length} label="Sectors" note="with at least one buy" />
            <SummaryCell value={tips.length} label="Today's tips" note={tips.length > 0 ? "One reason each" : "None today"} />
          </div>
          <details className="sg-why">
            <summary>
              How a stock gets a Buy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="sg-why-body">
              <dl className="sg-why-list">
                <div className="sg-why-row">
                  <dt><SignalChip signal="buy" strength="strong" /></dt>
                  <dd>A Good or Excellent company that is clearly cheap and still low in its yearly price range.</dd>
                </div>
                <div className="sg-why-row">
                  <dt><SignalChip signal="buy" /></dt>
                  <dd>A Good or Excellent company at a cheap or fair price — worth a closer look.</dd>
                </div>
                <div className="sg-why-row">
                  <dt className="sg-why-k">Kept off the list</dt>
                  <dd>
                    Average or Weak companies, Z category, old financial reports, thin trading (under ৳10 lakh a
                    day), profit down 25% or more on last year, or a price already near the top of its yearly range.
                  </dd>
                </div>
              </dl>
              <Bn className="sg-why-bn">
                ভালো বা খুব ভালো কোম্পানি, যার দাম সস্তা বা ন্যায্য — শুধু সেগুলোই এখানে আসে। দুর্বল, Z ক্যাটাগরির,
                কম লেনদেনের বা লাভ কমে যাওয়া কোম্পানি বাদ পড়ে।
              </Bn>
            </div>
          </details>
        </section>

        {updated && (
          <p className="sg-updated">
            Updated {updated} · from company results, today&apos;s price and how actively each share trades
          </p>
        )}

        <section aria-labelledby="signals-h" className="sg-section">
          <SectionHeader
            id="signals-h"
            size="lg"
            title="Today's buy signals"
            bn="আজকের কেনার সংকেত, প্রতিটির সহজ কারণসহ।"
            lead="Strong buys first, then by score. Each one carries the plain reason behind it."
          />
          <SignalsExplorer buy={buy} sectors={sectors} />
        </section>

        {/* Today's tips — a handful of names that stand out for one plain
            reason each (growing profits, steady dividends, a low price). */}
        {tips.length > 0 && (
          <section id="tips" aria-labelledby="tips-h" className="sg-section scroll-mt-24">
            <SectionHeader
              id="tips-h"
              size="lg"
              title="Today's tips"
              bn="প্রতিদিন কয়েকটি শেয়ার, আর সহজ ভাষায় কেন সেগুলো নজরে রাখার মতো।"
              lead="A fresh handful of stocks worth a look, each with one simple reason it stands out."
            />
            <div className="soft-card sg-card">
              <ul className="sg-rows sg-rows--two">
                {tips.map((tip) => (
                  <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} />
                ))}
              </ul>
            </div>
          </section>
        )}

        <HubLinks group="find" exclude={["/buy-sell-signals"]} />

        {/* Responsible-use note */}
        <p className="sg-note">
          Signals come from company results, today&apos;s price and trading activity. They are not predictions
          and not investment advice — always do your own research before buying or selling. See our{" "}
          <a href="/disclaimer" className="font-semibold text-primary-ink hover:underline">
            disclaimer
          </a>
          .
        </p>
      </div>
    </>
  );
}

function SummaryCell({
  value,
  label,
  note,
  tone = "default",
}: {
  value: number;
  label: string;
  note?: string;
  tone?: "default" | "positive";
}) {
  return (
    <div className="sg-cell">
      <p className={`sg-cell-v ${tone === "positive" && value > 0 ? "text-positive" : "text-text-main"}`}>{value}</p>
      <p className="sg-cell-k">{label}</p>
      {note && <p className="sg-cell-x">{note}</p>}
    </div>
  );
}
