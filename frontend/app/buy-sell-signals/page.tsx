import type { Metadata } from "next";
import { flattenTiers, getDailyTips, getScores, type ScoreItem } from "@/lib/api";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";
import SectionHeader from "@/components/ui/SectionHeader";
import SignalsExplorer from "@/components/signals/SignalsExplorer";
import { formatDate } from "@/lib/formatters";
import PageHeader from "@/components/ui/PageHeader";
import FindTabs from "@/components/layout/FindTabs";
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

  if (!scores) {
    return (
      <div className="text-center py-20 text-text-muted">
        Unable to load signals. Please try again shortly.
      </div>
    );
  }

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
        <FindTabs current="/buy-sell-signals" />
        <PageHeader
          eyebrow="Daily Signals · Dhaka Stock Exchange"
          title="Buy Signals"
          bn="প্রতিদিন কেনার মতো শেয়ারের পরিষ্কার তালিকা — সাশ্রয়ী দামে শক্তিশালী কোম্পানি। কেনার জোরালো কারণ না থাকলে শেয়ারটি এখানে দেখানো হয় না।"
          lead={
            <>
              A clear, daily list of the DSE stocks worth buying — strong companies at a sensible
              price. <strong>Strong Buy</strong> marks the cheapest, highest-conviction picks. When
              there is no clear reason to buy, a stock simply doesn&apos;t appear here — we stay
              quiet rather than guess.
            </>
          }
          actions={
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[16rem]">
              <StatTile tone="var(--positive)" glyph="▲" count={buy.length} label="Buy signals" />
              <StatTile tone="var(--positive)" glyph="★" count={strongCount} label="Strong buys" />
            </div>
          }
        />

        {updated && (
          <p className="text-xs -mt-3 mb-5 text-text-muted">
            Updated {updated} · based on fundamentals, price &amp; how actively each share trades
          </p>
        )}

        {/* How to read */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <HowCard
            tone="var(--positive)"
            glyph="★"
            title="Strong Buy"
            body="A strong company that is deeply cheap and still low in its 52-week range — the highest-conviction picks."
          />
          <HowCard
            tone="var(--positive)"
            glyph="▲"
            title="Buy"
            body="A strong company trading at a sensible or cheap price — worth a closer look to buy."
          />
          <HowCard
            tone="var(--text-muted)"
            glyph="•"
            title="No signal"
            body="Nothing decisive to buy. Those stocks simply don't appear here — no guessing."
          />
        </section>

        {/* Interactive explorer */}
        <SignalsExplorer buy={buy} sectors={sectors} />

        {/* Today's tips — a handful of names that stand out for one plain
            reason each (growing profits, steady dividends, a low price). */}
        {tips.length > 0 && (
          <section id="tips" aria-labelledby="tips-h" className="mt-12 scroll-mt-24">
            <SectionHeader
              id="tips-h"
              title="Today's tips"
              bn="প্রতিদিন কয়েকটি শেয়ার, আর সহজ ভাষায় কেন সেগুলো নজরে রাখার মতো।"
              lead="A fresh handful of stocks worth a look, each with one simple reason it stands out."
            />
            <div className="flex flex-col gap-3.5">
              {tips.map((tip) => (
                <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} />
              ))}
            </div>
          </section>
        )}

        <HubLinks group="find" exclude={["/buy-sell-signals"]} />

        {/* Responsible-use note */}
        <p className="mt-10 border-t border-border pt-5 text-xs leading-relaxed text-text-muted">
          Signals are generated from company fundamentals, current price, and trading activity —
          they are not predictions or guaranteed outcomes, and they are not investment advice.
          Always do your own research before buying or selling. See our{" "}
          <a href="/disclaimer" className="font-semibold text-primary hover:underline">
            disclaimer
          </a>
          .
        </p>
      </div>
    </>
  );
}

function StatTile({
  tone,
  glyph,
  count,
  label,
}: {
  tone: string;
  glyph: string;
  count: number;
  label: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: `color-mix(in srgb, ${tone} 8%, var(--surface))`,
        border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center rounded-lg text-xs"
          style={{
            width: 26,
            height: 26,
            background: `color-mix(in srgb, ${tone} 16%, transparent)`,
            color: tone,
          }}
          aria-hidden
        >
          {glyph}
        </span>
        <span className="nums text-3xl font-bold leading-none" style={{ color: tone }}>
          {count}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-text-muted">
        {label}
      </p>
    </div>
  );
}

function HowCard({
  tone,
  glyph,
  title,
  body,
}: {
  tone: string;
  glyph: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center rounded-md text-xs"
          style={{
            width: 22,
            height: 22,
            background: `color-mix(in srgb, ${tone} 14%, transparent)`,
            color: tone,
          }}
          aria-hidden
        >
          {glyph}
        </span>
        <span className="text-sm font-bold text-text-main">
          {title}
        </span>
      </div>
      <p className="mt-2 text-sm leading-snug text-text-muted">
        {body}
      </p>
    </div>
  );
}
