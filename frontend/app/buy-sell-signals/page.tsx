import type { Metadata } from "next";
import { Suspense } from "react";
import { flattenTiers, getScores, type ScoreItem } from "@/lib/api";
import SignalsExplorer from "@/components/signals/SignalsExplorer";
import { formatDate } from "@/lib/formatters";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const TITLE = "DSE Buy Signals — What to Buy Today";
const DESC =
  "Daily Buy and Strong Buy signals for Dhaka Stock Exchange (DSE) stocks — which shares look worth buying right now, each with a plain-English reason. Strong Buy flags the cheapest, highest-conviction picks.";

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
  const scores = await getScores().catch(() => null);

  if (!scores) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
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
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* Hero */}
        <header
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {/* Decorative tone blobs */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -80,
              left: -60,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--positive) 20%, transparent), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -70,
              right: -60,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--negative) 16%, transparent), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div className="relative p-6 sm:p-9">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-full"
              style={{
                color: "var(--primary)",
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
              }}
            >
              <span aria-hidden>⚡</span> Daily Signals · Dhaka Stock Exchange
            </span>

            <h1
              className="font-display font-black tracking-tight mt-4 leading-[1.05]"
              style={{ color: "var(--text)", fontSize: "clamp(1.9rem, 5.5vw, 3rem)" }}
            >
              Buy{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, var(--positive), var(--primary))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Signals
              </span>
            </h1>

            <p
              className="mt-3 max-w-2xl text-[15px] sm:text-base leading-relaxed"
              style={{ color: "var(--text)" }}
            >
              A clear, daily list of the DSE stocks worth buying — strong companies at a sensible
              price. <b>Strong Buy</b> marks the cheapest, highest-conviction picks. When there is
              no clear reason to buy, a stock simply doesn&apos;t appear here — we stay quiet rather
              than guess.
            </p>
            <p
              className="mt-2 max-w-2xl text-sm leading-relaxed font-bn"
              lang="bn"
              style={{ color: "var(--text-muted)" }}
            >
              প্রতিদিন কেনার মতো শেয়ারের পরিষ্কার তালিকা — সাশ্রয়ী দামে শক্তিশালী কোম্পানি।
              &quot;জোরালো কেনা যায়&quot; মানে সবচেয়ে সস্তা ও নিশ্চিত পছন্দ। কেনার জোরালো কারণ
              না থাকলে শেয়ারটি এখানে দেখানো হয় না।
            </p>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3 mt-6 max-w-md">
              <StatTile tone="var(--positive)" glyph="▲" count={buy.length} label="Buy signals" />
              <StatTile tone="var(--positive)" glyph="★" count={strongCount} label="Strong buys" />
            </div>

            {updated && (
              <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
                Updated {updated} · based on fundamentals, price &amp; how actively each share trades
              </p>
            )}
          </div>
        </header>

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
        <Suspense>
          <SignalsExplorer buy={buy} sectors={sectors} />
        </Suspense>

        {/* Responsible-use note */}
        <p
          className="text-xs leading-relaxed mt-10 pt-5 max-w-3xl"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
        >
          Signals are generated from company fundamentals, current price, and trading activity —
          they are not predictions or guaranteed outcomes, and they are not investment advice.
          Always do your own research before buying or selling. See our{" "}
          <a href="/disclaimer" className="font-semibold hover:underline" style={{ color: "var(--primary)" }}>
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
          className="inline-flex items-center justify-center rounded-lg"
          style={{
            width: 26,
            height: 26,
            background: `color-mix(in srgb, ${tone} 16%, transparent)`,
            color: tone,
            fontSize: 11,
          }}
          aria-hidden
        >
          {glyph}
        </span>
        <span className="text-3xl font-black tabular-nums leading-none" style={{ color: tone }}>
          {count}
        </span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide mt-2" style={{ color: "var(--text-muted)" }}>
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
          className="inline-flex items-center justify-center rounded-md"
          style={{
            width: 22,
            height: 22,
            background: `color-mix(in srgb, ${tone} 14%, transparent)`,
            color: tone,
            fontSize: 10,
          }}
          aria-hidden
        >
          {glyph}
        </span>
        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>
          {title}
        </span>
      </div>
      <p className="text-[13px] leading-snug mt-2" style={{ color: "var(--text-muted)" }}>
        {body}
      </p>
    </div>
  );
}
