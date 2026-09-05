import type { Metadata } from "next";
import Link from "next/link";
import { getTop20 } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import Top20Deck from "@/components/top20/Top20Deck";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const PAGE_URL = `${BASE_URL}/dse-trending-stocks`;

export const metadata: Metadata = {
  title: "DSE Trending Stocks — This Week's Top Movers | TopStockBD",
  description:
    "The 20 strongest-performing Dhaka Stock Exchange stocks over the last 7 trading days. Updated daily and ranked by price momentum, relative strength vs DSEX, volume conviction, and trend quality.",
  keywords: [
    "DSE trending stocks",
    "trending stocks Bangladesh",
    "trending shares DSE",
    "DSE top movers this week",
    "best performing DSE stocks",
    "DSE momentum stocks",
    "Dhaka Stock Exchange trending stocks",
    "DSE weekly movers",
    "hot stocks DSE",
    "top 20 DSE stocks",
    "DSE stock movers",
    "best stocks to buy DSE",
  ],
  alternates: { canonical: "/dse-trending-stocks" },
  openGraph: {
    title: "DSE Trending Stocks — This Week's Top Movers",
    description:
      "The 20 strongest Dhaka Stock Exchange stocks, ranked daily by 7-day momentum, relative strength vs DSEX, and volume conviction. Updated after every market close.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Trending Stocks — Top Movers This Week",
    description:
      "The 20 strongest DSE stocks ranked by 7-day market data. Updated daily.",
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What are DSE trending stocks?",
    a: "Trending Stocks is a daily list of 20 Dhaka Stock Exchange shares selected purely from the last 7 trading days of market data — price action, relative strength against the DSEX index, and turnover trends. It is not a fundamental screen and does not use earnings, dividends, or balance-sheet metrics.",
  },
  {
    q: "How is the trending stocks list calculated?",
    a: "Every stock with at least 5 of the last 7 trading days of price data and an average daily turnover of ৳1 million or more is scored on five factors: 7-day price return (35%), relative strength vs DSEX (25%), volume conviction measured as 7-day vs 30-day turnover (20%), trend quality based on up-day ratio with a whipsaw penalty (15%), and a 52-week sweet-spot bonus (5%). Each factor is z-scored across the universe, then combined into a composite. The 20 highest composite scores make the Trending Stocks list.",
  },
  {
    q: "How often is the trending stocks list updated?",
    a: "The list is recomputed every day after the DSE close, once the daily price scrape finishes. The page then refreshes so the newest list appears after each market close.",
  },
  {
    q: "Does the trending stocks list use fundamental analysis or a company score?",
    a: "No. This page is deliberately separate from our fundamental Stock Rankings on /dsestockranking. Trending Stocks looks only at recent market behaviour — momentum, breadth, and liquidity — to surface what the market is actually rewarding right now.",
  },
  {
    q: "What is the difference between Trending Stocks and Popular Stocks?",
    a: "Popular Stocks ranks tickers by how many times site visitors viewed them — a reader-interest signal. Trending Stocks ranks by what the market actually did over the last 7 trading days. They often disagree, which is the point.",
  },
  {
    q: "Can I use the trending stocks list as a buy list?",
    a: "No. Trending Stocks is a starting point for research, not a buy list. Momentum can reverse quickly on the DSE, especially around dividend record dates and category changes. Always cross-check fundamentals, your own risk tolerance, and recent news before acting.",
  },
  {
    q: "Why are some popular stocks not trending?",
    a: "The list filters out stocks with thin liquidity (under ৳1 million average daily turnover) and stocks missing recent price data. A widely watched ticker that traded sideways with no volume surge over the last week will not score highly on this composite, even if it is fundamentally strong.",
  },
  {
    q: "How do you handle penny stocks and pump candidates?",
    a: "The ৳1 million daily turnover floor removes the most obvious pump-and-dump candidates. The trend-quality factor also penalises whipsaw moves, so a single-day spike on otherwise erratic price action will not lift a stock into the top ranks.",
  },
];

const CONDITION_COPY: Record<string, { eyebrow: string; line: string }> = {
  rising: {
    eyebrow: "Market is rising",
    line: "In a rising market, the list favors stocks confirming the move — strong 7-day returns paired with above-normal turnover. These are the leaders pulling the DSEX higher.",
  },
  falling: {
    eyebrow: "Market is falling",
    line: "In a falling market, the list surfaces resilience — stocks holding up against the DSEX slide, often with quiet accumulation visible in turnover. These are the relative-strength names that historically lead the next rebound.",
  },
  sideways: {
    eyebrow: "Market is sideways",
    line: "In a sideways market, the list highlights setups where turnover is rising even though price is not yet — accumulation candidates. Watch for breakouts to confirm.",
  },
  unknown: {
    eyebrow: "Market state",
    line: "The current market condition could not be determined. The list still ranks the strongest 7-day setups across the liquid DSE universe.",
  },
};

function buildJsonLd(args: {
  asOfDate: string | null;
  generatedAt: string;
  items: { rank: number; trading_code: string; company_name: string | null }[];
}) {
  const now = new Date().toISOString();
  const datePublished = args.asOfDate ? `${args.asOfDate.slice(0, 10)}T00:00:00Z` : now;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": PAGE_URL,
        url: PAGE_URL,
        name: "DSE Trending Stocks — This Week's Top Movers",
        description:
          "The strongest Dhaka Stock Exchange stocks over the last 7 trading days, ranked by price momentum, relative strength vs DSEX, and volume conviction.",
        inLanguage: "en",
        datePublished,
        dateModified: args.generatedAt || now,
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Trending Stocks", item: PAGE_URL },
        ],
      },
      {
        "@type": "ItemList",
        name: "DSE Trending Stocks — 7-Day Momentum",
        description:
          "Twenty Dhaka Stock Exchange stocks ranked by a 7-day market-data composite: price momentum, relative strength vs DSEX, volume conviction, trend quality, and 52-week sweet-spot bonus.",
        numberOfItems: args.items.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: args.items.map((it) => ({
          "@type": "ListItem",
          position: it.rank,
          name: it.company_name ? `${it.company_name} (${it.trading_code})` : it.trading_code,
          url: `${BASE_URL}/stock/${it.trading_code}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default async function DseTrendingStocksPage() {
  const data = await getTop20().catch(() => null);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-[var(--text-muted)]">
        Unable to load Trending Stocks right now. Please try again shortly.
      </div>
    );
  }

  const dateLabel = data.as_of_date ? formatDate(data.as_of_date.slice(0, 10)) : null;
  const condition = data.market_condition || "unknown";
  const copy = CONDITION_COPY[condition] || CONDITION_COPY.unknown;
  const dsexLine =
    data.dsex_7d_change_pct != null
      ? `DSEX is ${data.dsex_7d_change_pct >= 0 ? "up" : "down"} ${Math.abs(
          data.dsex_7d_change_pct,
        ).toFixed(2)}% over the same 7 days.`
      : "";

  const jsonLd = buildJsonLd({
    asOfDate: data.as_of_date,
    generatedAt: data.generated_at,
    items: data.items,
  });

  const conditionColor =
    condition === "rising" ? "var(--positive)" : condition === "falling" ? "var(--negative)" : "var(--text-muted)";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* Page header — colorful, centered */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "20px",
            padding: "clamp(28px, 5vw, 48px) 20px",
            textAlign: "center",
            background:
              "radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, #38BDF8 22%, transparent) 0%, transparent 55%), linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--surface)) 0%, var(--surface) 45%, color-mix(in srgb, #A78BFA 14%, var(--surface)) 100%)",
            border: "1px solid color-mix(in srgb, var(--primary) 22%, var(--border))",
            boxShadow: "0 18px 40px -24px color-mix(in srgb, var(--primary) 60%, transparent)",
          }}
        >
          {/* glow accents */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-40px",
              left: "-30px",
              width: "180px",
              height: "180px",
              borderRadius: "999px",
              background: "radial-gradient(circle, color-mix(in srgb, #22D3EE 30%, transparent) 0%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: "-50px",
              right: "-20px",
              width: "200px",
              height: "200px",
              borderRadius: "999px",
              background: "radial-gradient(circle, color-mix(in srgb, #A78BFA 28%, transparent) 0%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />

          <div style={{ position: "relative" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#fff",
                background: "linear-gradient(90deg, #38BDF8 0%, #22D3EE 50%, #A78BFA 100%)",
                padding: "6px 14px",
                borderRadius: "999px",
                marginBottom: "16px",
                boxShadow: "0 6px 16px -6px color-mix(in srgb, var(--primary) 70%, transparent)",
              }}
            >
              🔥 TopStockBD · DSE Momentum
            </span>

            <h1
              style={{
                fontSize: "clamp(2.4rem, 7vw, 4rem)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
                margin: "0 auto",
                background: "linear-gradient(100deg, #F28C00 0%, #E8760A 45%, #B85D00 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Trending Stocks
            </h1>

            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.55,
                maxWidth: "620px",
                margin: "14px auto 0",
                color: "var(--ink)",
              }}
            >
              The strongest DSE stocks of the last 7 trading days — ranked by momentum, strength vs DSEX, and turnover.
            </p>
          </div>
        </div>

        {/* The deck */}
        <div className="mt-7">
          <Top20Deck items={data.items} />
        </div>

        {/* Methodology */}
        <section className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
            How we build the Trending Stocks list
          </h2>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            The Trending Stocks list is a market-data composite — no earnings models, no fundamental scoring.
            Every stock listed on the Dhaka Stock Exchange that has at least five of the last seven
            trading days of price data and an average daily turnover of ৳1 million or more enters
            the universe. Bonds, debentures, mutual funds, and ETFs are excluded automatically.
          </p>
          <p className="text-[var(--ink)] leading-relaxed mb-4">
            Each surviving stock is scored on five factors. Each factor is z-scored across the
            universe so the magnitude of one signal cannot dominate another. The weights below are
            fixed and do not change with the market condition.
          </p>

          <div className="mt-5 mb-6 rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg)]">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--ink-muted)]">Factor</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--ink-muted)]">Weight</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--ink-muted)]">What it captures</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-semibold">Price momentum (7d)</td>
                  <td className="px-4 py-2">35%</td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">7-day return, capped at ±30% to limit outlier dominance</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-semibold">Relative strength vs DSEX</td>
                  <td className="px-4 py-2">25%</td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">Stock 7d return minus DSEX 7d return — finds resilience</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-semibold">Volume conviction</td>
                  <td className="px-4 py-2">20%</td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">log of 7-day vs 30-day average turnover (Tk)</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-semibold">Trend quality</td>
                  <td className="px-4 py-2">15%</td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">Up-day ratio minus a whipsaw penalty (σ/|μ|)</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-4 py-2 font-semibold">52-week sweet spot</td>
                  <td className="px-4 py-2">5%</td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">+1 if 60–90% of 52w range, −1 if extended above 95%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[var(--ink)] leading-relaxed mb-4">
            Why these five and not pure 7-day return? Because pure return rewards already-overheated
            tickers and penny-stock pumps. Adding relative strength tells us the stock is beating the
            broader DSE — not just riding a rising tide. Volume conviction tells us the move has real
            money behind it. Trend quality discriminates a clean five-up-out-of-seven climb from a
            single 20% spike on a flat baseline. And the 52-week bonus nudges the list toward
            momentum that has room to run rather than tickers already pinned at their high.
          </p>
          <p className="text-[var(--ink)] leading-relaxed">
            Twenty is a deliberate count. Smaller than that and a single sector dominates the list;
            larger and you have to dig past noise. Twenty fits comfortably on a page, gives sector
            diversity, and matches how most traders build a working watchlist.
          </p>
        </section>

        {/* Dynamic condition explainer */}
        <section className="mt-10 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
            What &quot;trending&quot; means on the DSE this week
          </h2>
          <p className="text-[var(--ink)] leading-relaxed">
            {copy.line} The list above reflects that. {dsexLine} The list is recomputed every
            day after the close, so the names change as the market regime changes — the same five
            factors, applied to fresh data.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-10 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <summary className="cursor-pointer font-semibold text-[var(--ink)] list-none flex items-center justify-between gap-3">
                  <span>{f.q}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[var(--ink-muted)] transition-transform group-open:rotate-45"
                    style={{ fontSize: 18, lineHeight: 1 }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-[var(--ink)] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="mt-10 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">Related rankings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/dsestockranking"
              className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--primary)] transition-colors"
            >
              <div className="font-semibold text-[var(--ink)]">DSE Stock Rankings</div>
              <div className="text-sm text-[var(--ink-muted)] mt-1">
                Our long-term fundamental score across every listed company.
              </div>
            </Link>
            <Link
              href="/dse-popular-stocks"
              className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--primary)] transition-colors"
            >
              <div className="font-semibold text-[var(--ink)]">DSE Popular Stocks</div>
              <div className="text-sm text-[var(--ink-muted)] mt-1">
                The 20 most-viewed DSE stocks on TopStockBD this week.
              </div>
            </Link>
            <Link
              href="/market-analysis"
              className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--primary)] transition-colors"
            >
              <div className="font-semibold text-[var(--ink)]">Market Analysis</div>
              <div className="text-sm text-[var(--ink-muted)] mt-1">
                Pulse, sentiment, near-extremes, trending, and top picks across the DSE.
              </div>
            </Link>
            <Link
              href="/stocks"
              className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--primary)] transition-colors"
            >
              <div className="font-semibold text-[var(--ink)]">Browse All DSE Stocks</div>
              <div className="text-sm text-[var(--ink-muted)] mt-1">
                A–Z, sortable table of every Dhaka Stock Exchange ticker.
              </div>
            </Link>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="mt-10 text-xs text-[var(--ink-muted)] text-center max-w-3xl mx-auto leading-relaxed">
          This page is for informational purposes only and is not investment advice. Past
          performance and short-term momentum do not guarantee future results. Always do your own
          research and consult a licensed advisor before making investment decisions on the Dhaka
          Stock Exchange.
        </p>
      </div>
    </>
  );
}
