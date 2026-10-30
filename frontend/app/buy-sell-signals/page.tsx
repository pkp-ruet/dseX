import type { Metadata } from "next";
import { flattenTiers, getDailyTips, getScores, getSignalDetail, type ScoreItem } from "@/lib/api";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";
import SectionHeader from "@/components/ui/SectionHeader";
import SignalsExplorer from "@/components/signals/SignalsExplorer";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
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
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const [scores, tipsData, detailData] = await Promise.all([
    getScores(),
    getDailyTips().catch(() => null),
    getSignalDetail().catch(() => null),
  ]);
  const detail = detailData?.items ?? {};
  const tips = tipsData?.tips ?? [];

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

  const questions = signalQuestions(buy, strongCount, detail, detailData?.as_of ?? null);

  const updated = scores.computed_at ? formatDate(scores.computed_at) : null;
  const updatedBn = scores.computed_at ? bnDate(scores.computed_at) : null;

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
        // Every row is free; the reason and prices under each are Premium
        // (screen-only lock, 2026-10-31).
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
          title={<T en="Buy signals" bn="কেনার সংকেত" />}
          lead={
            <T
              en="Good companies at a sensible price, checked every trading day. When there is no clear reason to buy, a share does not appear here."
              bn="ভালো কোম্পানি, যুক্তিসংগত দামে, প্রতি লেনদেনের দিন যাচাই করা। কেনার স্পষ্ট কারণ না থাকলে শেয়ারটি এখানে আসে না।"
            />
          }
        />

        {/* Summary: the numbers first, the rule folded underneath. */}
        <section aria-label="Today's buy signals" className="soft-card sg-summary">
          <div className="sg-summary-grid">
            <SummaryCell value={buy.length} label={<T en="Buy signals today" bn="আজকের কেনার সংকেত" />} tone="positive" />
            <SummaryCell
              value={strongCount}
              label={<T en="Strong buys" bn="কেনার ভালো সুযোগ" />}
              note={<T en="The cheapest of them" bn="এদের মধ্যে সবচেয়ে কম দামের" />}
            />
            <SummaryCell
              value={sectors.length}
              label={<T en="Sectors" bn="সেক্টর" />}
              note={<T en="with at least one buy" bn="অন্তত একটি কেনার সংকেতসহ" />}
            />
            <SummaryCell
              value={tips.length}
              label={<T en="Today's tips" bn="আজকের টিপস" />}
              note={
                tips.length > 0 ? (
                  <T en="One reason each" bn="প্রতিটির একটি কারণ" />
                ) : (
                  <T en="None today" bn="আজ নেই" />
                )
              }
            />
          </div>
          <details className="sg-why">
            <summary>
              <T en="How a share gets a Buy signal" bn="কীভাবে একটি শেয়ার কেনার সংকেত পায়" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="sg-why-body">
              <dl className="sg-why-list">
                <div className="sg-why-row">
                  <dt><SignalChip signal="buy" strength="strong" /></dt>
                  <dd>
                    <T
                      en="A Good or Excellent company that is clearly cheap and still low in its price range for the year."
                      bn="ভালো বা চমৎকার গ্রেডের কোম্পানি, যার দাম স্পষ্টভাবে কম, আর এ বছরের দামের সীমায় এখনো নিচের দিকে।"
                    />
                  </dd>
                </div>
                <div className="sg-why-row">
                  <dt><SignalChip signal="buy" /></dt>
                  <dd>
                    <T
                      en="A Good or Excellent company at a low or fair price. It is worth a closer look."
                      bn="ভালো বা চমৎকার গ্রেডের কোম্পানি, কম বা ন্যায্য দামে। এটি ভালো করে দেখে নেওয়ার মতো।"
                    />
                  </dd>
                </div>
                <div className="sg-why-row">
                  <dt className="sg-why-k">
                    <T en="Kept off the list" bn="যারা তালিকায় আসে না" />
                  </dt>
                  <dd>
                    <T
                      en="Average or Weak companies, Z category shares, companies with old financial reports, shares that trade under ৳10 lakh a day, profit down 25% or more on last year, or a price already near the top of its range for the year."
                      bn="মাঝারি বা দুর্বল গ্রেডের কোম্পানি, Z ক্যাটাগরির শেয়ার, পুরোনো আর্থিক রিপোর্টের কোম্পানি, দিনে ৳10 লাখের কম লেনদেন হওয়া শেয়ার, গত বছরের চেয়ে 25% বা তার বেশি কমে যাওয়া মুনাফা, অথবা এ বছরের সর্বোচ্চ দামের কাছাকাছি থাকা শেয়ার।"
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        </section>

        {updated && (
          <p className="sg-updated">
            <T
              en={`Updated ${updated}. Built from company results, today's price and how actively each share trades.`}
              bn={`হালনাগাদ ${updatedBn ?? updated}। কোম্পানির ফলাফল, আজকের দাম আর প্রতিটি শেয়ারের লেনদেন দেখে তৈরি।`}
            />
          </p>
        )}

        <section aria-labelledby="signals-h" className="sg-section">
          <SectionHeader
            id="signals-h"
            size="lg"
            title={<T en="Today's buy signals" bn="আজকের কেনার সংকেত" />}
            lead={
              <T
                en="Every Buy today, free. Strong buys come first, then the rest by score."
                bn="আজকের প্রতিটি কেনার সংকেত, ফ্রি। আগে কেনার ভালো সুযোগগুলো, তারপর বাকিগুলো স্কোর অনুযায়ী।"
              />
            }
          />
          <SignalsExplorer buy={buy} sectors={sectors} detail={detail} />
        </section>

        <PageQuestions
          id="sg-premium"
          area="signals"
          className="sg-section"
          title={{ en: "Every Buy is free. Here is what it leaves open.", bn: "প্রতিটি কেনার সংকেত ফ্রি। তবু কিছু প্রশ্ন থেকে যায়।" }}
          lead={{
            en: "Premium answers these under every row: why it is a Buy, our buy price, and the price where it stops being one.",
            bn: "প্রিমিয়ামে প্রতিটি সারির নিচে এর উত্তর: কেন কেনার সংকেত, আমাদের কেনার দাম, আর কোন দামে এটি আর কেনার সংকেত থাকবে না।",
          }}
          rows={questions}
          label={{ en: "Why each Buy, and up to what price", bn: "প্রতিটি কেনার সংকেত কেন, আর কোন দাম পর্যন্ত" }}
        />

        {/* Today's tips — a handful of names that stand out for one plain
            reason each (growing profits, steady dividends, a low price). */}
        {tips.length > 0 && (
          <section id="tips" aria-labelledby="tips-h" className="sg-section scroll-mt-24">
            <SectionHeader
              id="tips-h"
              size="lg"
              title={<T en="Today's tips" bn="আজকের টিপস" />}
              lead={
                <T
                  en="A few shares worth a look today, each with one simple reason it stands out."
                  bn="আজ দেখে নেওয়ার মতো কয়েকটি শেয়ার, প্রতিটি কেন আলাদা তার একটি সহজ কারণসহ।"
                />
              }
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
          <T
            en={
              <>
                Signals come from company results, today&apos;s price and trading activity. They are not
                predictions and not investment advice, so please do your own research before you buy or sell.
                See our{" "}
                <a href="/disclaimer" className="font-semibold text-primary-ink hover:underline">
                  disclaimer
                </a>
                .
              </>
            }
            bn={
              <>
                সংকেতগুলো কোম্পানির ফলাফল, আজকের দাম আর লেনদেন দেখে তৈরি। এগুলো ভবিষ্যদ্বাণী নয়, বিনিয়োগ
                পরামর্শও নয়, তাই কেনা বা বেচার আগে নিজে যাচাই করে নিন। আরও জানতে{" "}
                <a href="/disclaimer" className="font-semibold text-primary-ink hover:underline">
                  দায়মুক্তি
                </a>{" "}
                দেখুন।
              </>
            }
          />
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
  label: ReactNode;
  note?: ReactNode;
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

/** The page's question card rows: real counts from today's list, each with
 *  the question Premium answers under the rows. */
function signalQuestions(
  buy: ScoreItem[],
  strong: number,
  detail: Record<string, { since: string | null; since_floor: boolean; stop_above: number | null }>,
  asOf: string | null,
): PageQuestion[] {
  const rows: PageQuestion[] = [];
  if (buy.length > 0) {
    rows.push({
      key: "price",
      fact: { en: `${buy.length} Buy signals today`, bn: `আজ ${buy.length}টি কেনার সংকেত` },
      tone: "good",
      ask: { en: "Up to what price is each one a Buy?", bn: "কোন দাম পর্যন্ত প্রতিটি কেনার মতো?" },
      hint: { en: "Our buy price, and the price where the signal ends.", bn: "আমাদের কেনার দাম, আর কোন দামে সংকেতটি শেষ হয়।" },
    });
  }
  if (strong > 0) {
    rows.push({
      key: "why",
      fact: { en: `${strong} Strong buys`, bn: `${strong}টি কেনার ভালো সুযোগ` },
      tone: "good",
      ask: { en: "Why these, and not the others?", bn: "কেন এগুলো, অন্যগুলো নয়?" },
      hint: { en: "The plain reason behind every signal.", bn: "প্রতিটি সংকেতের পেছনের সহজ কারণ।" },
    });
  }
  if (asOf) {
    const week = new Date(new Date(asOf).getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const fresh = buy.filter((i) => {
      const d = detail[i.trading_code];
      return d?.since && !d.since_floor && d.since >= week;
    }).length;
    if (fresh > 0) {
      rows.push({
        key: "new",
        fact: { en: `${fresh} became Buys this week`, bn: `এ সপ্তাহে ${fresh}টি নতুন কেনার সংকেত` },
        tone: "neutral",
        ask: { en: "Which ones are new, and since when?", bn: "কোনগুলো নতুন, আর কবে থেকে?" },
        hint: { en: "How long each one has been a Buy.", bn: "প্রতিটি কতদিন ধরে কেনার সংকেত।" },
      });
    }
  }
  const near = buy.filter((i) => {
    const stop = detail[i.trading_code]?.stop_above;
    return stop && i.ltp && i.ltp >= stop * 0.95;
  }).length;
  if (near > 0) {
    rows.push({
      key: "near",
      fact: { en: `${near} close to their limit`, bn: `${near}টি সীমার কাছাকাছি` },
      tone: "fair",
      ask: { en: "Which could stop being a Buy soon?", bn: "কোনগুলো শিগগির কেনার সংকেত হারাতে পারে?" },
      hint: { en: "Within 5% of the price where the signal ends.", bn: "সংকেত শেষ হওয়ার দামের 5%-এর মধ্যে।" },
    });
  }
  return rows;
}
