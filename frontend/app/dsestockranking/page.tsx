import type { Metadata } from "next";
import PageGuide from "@/components/seo/PageGuide";
import Link from "next/link";
import { flattenTiers, getMarketIndex, getScores } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { PILLARS } from "@/lib/landing";
import RankingExplorer from "@/components/ranking/RankingExplorer";
import type { RankedItem } from "@/components/ranking/FullRankTable";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import HubLinks from "@/components/layout/HubLinks";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Stock Rankings by Fundamental Score",
  description:
    "All Dhaka Stock Exchange (DSE) listed companies ranked 1–N by fundamental score. See Excellent, Good, Average, and Weak ratings plus price, profit growth, and dividend yield.",
  alternates: { canonical: "/dsestockranking" },
  openGraph: {
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE companies ranked by fundamental score.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Stock Rankings by Fundamental Score",
    description: "All DSE listed companies ranked 1–N by fundamental score with price, profit growth, and dividend yield.",
  },
};

/** "31 Jul 2026" — tolerant of a null/garbage date so the rail never renders NaN. */
function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function DseStockRankingPage() {
  // The market index is only here for the price as-of date on the vintage rail —
  // it must never be able to take the leaderboard down.
  const [scores, marketIndex] = await Promise.all([
    getScores().catch(() => null),
    getMarketIndex().catch(() => null),
  ]);

  if (!scores) {
    return (
      <ErrorState
        title="Couldn't load the rankings"
        bn="র‍্যাংকিং এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
        reload
        links={[{ href: "/stocks", label: "Browse all stocks" }]}
      />
    );
  }

  const { tiers } = scores;

  const updated = fmtDate(scores.computed_at);

  // Flatten all API tiers and re-classify client-side via getTier
  // `signal` (with its English + Bengali reason text, ~half the payload) is
  // dropped: the table never reads it, and every row is serialized into the HTML.
  const allRanked: RankedItem[] = flattenTiers(scores).map(({ signal: _signal, ...i }) => ({
    ...i,
    tier: getTier(i.score),
  }));

  // Build counts from re-classified tiers
  const counts: Record<string, number> = {};
  for (const item of allRanked) {
    counts[item.tier] = (counts[item.tier] ?? 0) + 1;
  }

  // Unique sector list for the sector filter
  const sectors = Array.from(
    new Set(allRanked.map((i) => i.sector).filter((s): s is string => Boolean(s)))
  ).sort((a, b) => a.localeCompare(b));

  // ---- Data vintage + coverage limits, stated on the page rather than implied ----
  const priceDate = fmtDate(marketIndex?.date);
  const latestFy = allRanked.reduce<number | null>(
    (max, i) =>
      i.last_reported_year != null && (max == null || i.last_reported_year > max)
        ? i.last_reported_year
        : max,
    null
  );
  const staleCount = allRanked.filter((i) => i.stale_data).length;
  const zCount = allRanked.filter((i) => i.market_category?.toUpperCase() === "Z").length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dsestockranking`,
        url: `${BASE_URL}/dsestockranking`,
        name: "DSE Stock Rankings by Fundamental Score",
        description:
          "All Dhaka Stock Exchange (DSE) listed companies ranked by fundamental score with price, profit growth, and dividend yield.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "DSE Stock Rankings", item: `${BASE_URL}/dsestockranking` },
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
      {/* Masthead — the flagship leaderboard header; the numbers that establish
          scale sit beside the claim (actions slot) rather than under it */}
      <PageHeader
        eyebrow="Dhaka Stock Exchange"
        title="DSE Stock Rankings"
        bn="ঢাকা স্টক এক্সচেঞ্জের প্রতিটি কোম্পানিকে তার ব্যবসা কতটা শক্তিশালী সেই অনুযায়ী নম্বর দিয়ে সেরা থেকে দুর্বল ক্রমে সাজানো হয়েছে।"
        lead="Every company on the Dhaka Stock Exchange, scored on how strong its business really is — then ranked from strongest to weakest."
        actions={
          <div className="flex flex-wrap gap-5 sm:gap-6" aria-label="Coverage">
            <div className="rank-cred">
              <span className="rank-cred-num">{allRanked.length}</span>
              <span className="rank-cred-label">Companies scored</span>
            </div>
            <div className="rank-cred">
              <span className="rank-cred-num">{sectors.length}</span>
              <span className="rank-cred-label">Sectors covered</span>
            </div>
            <div className="rank-cred">
              <span className="rank-cred-num">{PILLARS.length}</span>
              <span className="rank-cred-label">Checks on every one</span>
            </div>
          </div>
        }
      />

      {/* Method + data vintage — what the score is made of and how fresh it is.
          The written-out method lives on /about; this only points at it. */}
      <section className="rank-method" aria-label="How the score is built">
        <div className="rank-method-row">
          <p className="rank-method-text">
            Every company gets the same five checks —{" "}
            <span className="rank-method-checks">
              {PILLARS.map((p, i) => (
                <span key={p.key} className="rank-method-check">
                  {p.en}
                  {/* Separator keeps normal whitespace — the one place each
                      nowrap check name allows the line to break on phones */}
                  {i < PILLARS.length - 1 && (
                    <span className="rank-method-sep" aria-hidden>{" · "}</span>
                  )}
                </span>
              ))}
            </span>
          </p>
          <Link prefetch={false} href="/about" className="rank-method-link">
            How we score <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="rank-vintage">
          {priceDate && (
            <span className="rank-vintage-item">
              Prices <b>{priceDate}</b>
            </span>
          )}
          {latestFy && (
            <span className="rank-vintage-item">
              Financials through <b>FY{latestFy}</b>
            </span>
          )}
          {updated && (
            <span className="rank-vintage-item">
              Scores rebuilt <b>{updated}</b>
            </span>
          )}
        </div>
      </section>

      {/* Filters + ranked table */}
        <RankingExplorer
          items={allRanked}
          counts={counts}
          total={allRanked.length}
          sectors={sectors}
        />

      {/* What this list covers — and what it deliberately doesn't */}
      <section className="rank-limits" aria-label="What this list covers">
        <h2 className="rank-limits-title">What this list covers</h2>
        <ul className="rank-limits-points">
          <li className="rank-limits-point">
            Companies are ranked on how strong the business is — <b>this is not a
            buy list</b>. A strong company can still be a poor buy at today&apos;s price.
          </li>
          <li className="rank-limits-point">
            Bonds, debentures, mutual funds and ETFs are not scored, so they do not
            appear here.
          </li>
          {staleCount > 0 && (
            <li className="rank-limits-point">
              <b>{staleCount}</b> {staleCount === 1 ? "company has" : "companies have"} not
              published a recent annual report. They are marked ⚠ and their score is
              pulled down for it.
            </li>
          )}
          {zCount > 0 && (
            <li className="rank-limits-point">
              <b>{zCount}</b> Z-category {zCount === 1 ? "company is" : "companies are"}{" "}
              scored down for irregular dividends and extra trading limits.
            </li>
          )}
          <li className="rank-limits-point">
            Everything comes from published company reports and daily DSE prices. Same
            rules for every company — nobody pays to rank higher.
          </li>
        </ul>
        <p className="rank-limits-note">
          For learning only, not investment advice. Do your own checking before you buy
          or sell.
        </p>
        <p className="rank-limits-note font-bn" lang="bn">
          এটি শেখার জন্য, বিনিয়োগের পরামর্শ নয়। কেনা বা বেচার আগে নিজে যাচাই করে নিন।
        </p>
      </section>

      <HubLinks group="find" exclude={["/dsestockranking"]} />

      <PageGuide
        title="How the DSE stock ranking works"
        intro={[
          <>
            This is a <b>ranking of every operating company on the Dhaka Stock Exchange by the strength of its
            business</b>, from strongest to weakest, rebuilt after every trading day. Each company gets a score
            out of 100 from five checks on its own published accounts: earnings quality (30%), financial health
            (20%), competitive strength (20%), valuation against its sector (15%) and dividend sustainability
            (15%). Scores of 75 and above are labelled Excellent, 60 to 74 Good, 45 to 59 Average, and below 45
            Weak.
          </>,
          <>
            The same rules apply to all {allRanked.length} companies, with one honest exception: banks, NBFIs
            and insurers are judged on the measures that fit a lender or an insurer (capital cushion, interest
            margin, net margin) instead of debt ratios that mean nothing for them. A company whose latest annual
            report is two or more years old is scored down for staleness, and DSE&apos;s Z-category listings are
            scored down for irregular dividends.
          </>,
          <>
            A high rank means a strong business, not a cheap share. Whether today&apos;s price is attractive is a
            separate question, answered on each company page by the valuation check and the Buy or Sell signal,
            and across the market on <Link href="/buy-sell-signals">Buy Signals</Link>. Nobody can pay to move
            up this list.
          </>,
        ]}
        bn="ব্যবসা কতটা শক্ত, সেটাই এই র‍্যাঙ্কিং বলে — আজকের দামটা সস্তা কি না, সেটা কোম্পানির পাতায় আলাদা করে দেখা হয়।"
        faq={[
          {
            q: "What is the DSEF fundamental score?",
            a: "A 0–100 score TopStockBD computes from a company's published financial statements and DSE prices, using five weighted checks: earnings quality, financial health, competitive strength, valuation and dividend sustainability. It measures business strength, not price momentum.",
          },
          {
            q: "Does an Excellent rank mean I should buy the share?",
            a: "No. The rank describes the company; the price is judged separately. A strong company can be expensive, and the site only shows a Buy signal when the score is Good or Excellent, the share is reasonably valued, trades enough to exit, and profits have not just dropped sharply.",
          },
          {
            q: "How often is the DSE stock ranking updated?",
            a: "Prices and signals refresh after every trading day at the 2:30 PM close. Scores change when a company publishes new annual or quarterly figures, and the whole list is recomputed daily so a new filing shows up the next morning.",
          },
          {
            q: "Which stocks are not ranked?",
            a: "Mutual funds, bonds, debentures and ETFs, because they have no business earnings to score. Companies that have never published an annual report on DSE are also left out until they do.",
          },
        ]}
      />
    </>
  );
}
