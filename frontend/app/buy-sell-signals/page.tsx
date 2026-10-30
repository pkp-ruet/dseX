import type { Metadata } from "next";
import { flattenTiers, getScores, getSignalsToday, type ScoreItem, type SignalsToday } from "@/lib/api";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import SectionHeader from "@/components/ui/SectionHeader";
import SignalsExplorer from "@/components/signals/SignalsExplorer";
import SignalsFunnel from "@/components/signals/SignalsFunnel";
import SignalsChanges from "@/components/signals/SignalsChanges";
import SignalsChecks from "@/components/signals/SignalsChecks";
import AlmostOnList from "@/components/signals/AlmostOnList";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { PageLockScope } from "@/components/premium/LockScope";
import { bnDate } from "@/lib/bn";
import { priceWordKey, type PriceWordKey } from "@/lib/constants";
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import HubLinks from "@/components/layout/HubLinks";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const TITLE = "DSE Buy Signals: Shares Worth Buying Today";
const DESC =
  "Which Dhaka Stock Exchange (DSE) shares are worth buying today: good companies at a low or fair price that pass every check, each marked by how low its price is. See how the list was made and which good companies were left out, and why.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "DSE buy signal",
    "which stock to buy in DSE",
    "DSE stock signals",
    "DSE share buy recommendation",
    "best stocks to buy DSE",
    "Dhaka Stock Exchange signals",
    "DSE stocks to buy today",
    "undervalued DSE stocks",
    "কোন শেয়ার কিনব",
    "আজ কেনার মতো শেয়ার",
  ],
  alternates: { canonical: "/buy-sell-signals" },
  openGraph: {
    title: "Shares worth buying today on the DSE",
    description: DESC,
    url: `${BASE_URL}/buy-sell-signals`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shares worth buying today on the DSE",
    description: DESC,
  },
};

/** "Thu 30 Oct" — the trading day the list was checked after. */
function dayLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function BuySellSignalsPage() {
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  // The bundle is secondary: without it the list still renders (price words
  // fall back to the score rows' own signal).
  const [scores, today] = await Promise.all([getScores(), getSignalsToday().catch(() => null)]);
  const info = today?.buys ?? {};

  const all = flattenTiers(scores);
  const byCode: Record<string, ScoreItem> = Object.fromEntries(all.map((i) => [i.trading_code, i]));
  const wordOf = (i: ScoreItem): PriceWordKey => info[i.trading_code]?.price_word ?? priceWordKey(i.signal) ?? "low";
  const order: Record<PriceWordKey, number> = { very_low: 0, low: 1, fair: 2 };
  // Buys only (Sell lives on the stock page and the portfolio, where it is
  // about a share you own). Very low price first, then by grade score.
  const buy: ScoreItem[] = all
    .filter((i) => i.signal?.signal === "buy")
    .sort(
      (a, b) =>
        order[wordOf(a)] - order[wordOf(b)] ||
        (b.score ?? -1) - (a.score ?? -1),
    );

  const sectors = Array.from(new Set(buy.map((i) => i.sector).filter((s): s is string => Boolean(s)))).sort((a, b) =>
    a.localeCompare(b),
  );
  const names = Object.fromEntries(all.map((i) => [i.trading_code, i.company_name]));
  // The free sample: the first share on the list that has a Premium part.
  const sampleItem = buy.find((i) => (info[i.trading_code]?.why.length ?? 0) > 0) ?? null;
  const sampleCode = sampleItem?.trading_code ?? null;
  const sampleName = sampleItem ? sampleItem.company_name || sampleItem.trading_code : null;
  const questions = signalQuestions(buy, info, today);
  const asOf = today?.as_of ?? (scores.computed_at ? scores.computed_at.slice(0, 10) : null);

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
        // Every row is free; the reasons and prices under each, and the
        // almost-on-the-list names, are Premium (screen-only lock).
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Buy signals", item: `${BASE_URL}/buy-sell-signals` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PersonalCodesProvider>
        <PageLockScope anchor="sg-premium">
          <PageHeader
            eyebrow={
              asOf ? (
                <span className="sg-dateline">
                  <i aria-hidden="true" />
                  <T en={`Checked after the close, ${dayLabel(asOf)}`} bn={`লেনদেন শেষে যাচাই, ${bnDate(asOf, true)}`} />
                </span>
              ) : undefined
            }
            title={<T en="Shares worth buying today" bn="আজ কেনার মতো শেয়ার" />}
            lead={
              <T
                en="Good companies at a sensible price. A share is only here when it passes every check."
                bn="ভালো কোম্পানি, যুক্তিসংগত দামে। প্রতিটি যাচাইয়ে উতরালে তবেই একটি শেয়ার এখানে আসে।"
              />
            }
          />

          {today && <SignalsFunnel funnel={today.funnel} />}
          {today && <SignalsChanges changes={today.changes} names={names} />}

          <section aria-labelledby="signals-h" className="sg-section sg-section--first">
            <SectionHeader
              id="signals-h"
              size="lg"
              title={<T en={`Today's list · ${buy.length}`} bn={`আজকের তালিকা · ${buy.length}`} />}
              lead={
                <T
                  en="Every share is free to see. The price word says how low today's price is for that company. The first row also shows what Premium adds, as a free sample."
                  bn="প্রতিটি শেয়ার ফ্রিতে দেখা যায়। দামের শব্দটি বলে ওই কোম্পানির জন্য আজকের দাম কতটা কম। প্রথম সারিতে ফ্রি নমুনা হিসেবে প্রিমিয়ামের অংশও দেখানো হয়েছে।"
                />
              }
            />
            <SignalsExplorer
              buy={buy}
              sectors={sectors}
              info={info}
              sampleCode={sampleCode}
              // The page's one Premium card sits inside the list, right after
              // the free sample row has shown what Premium is (2026-10-31).
              premiumCard={
                <PageQuestions
                  id="sg-premium"
                  area="signals"
                  title={{
                    en: "The sample above, for every share on the list",
                    bn: "ওপরের নমুনাটি, তালিকার প্রতিটি শেয়ারের জন্য",
                  }}
                  lead={{
                    en: sampleName
                      ? `You just saw why ${sampleName} is a Buy and up to what price. Premium shows the same for all ${buy.length}, and more.`
                      : `Premium shows why each of the ${buy.length} is a Buy and up to what price, and more.`,
                    bn: sampleName
                      ? `${sampleName} কেন কেনার মতো আর কোন দাম পর্যন্ত, তা দেখলেন। প্রিমিয়ামে ${buy.length}টির প্রতিটির জন্য একই তথ্য, আর আরও কিছু।`
                      : `প্রিমিয়ামে ${buy.length}টির প্রতিটি কেন কেনার মতো আর কোন দাম পর্যন্ত, আর আরও কিছু।`,
                  }}
                  rows={questions}
                  label={{ en: "Why each Buy, and up to what price", bn: "প্রতিটি কেনার সংকেত কেন, আর কোন দাম পর্যন্ত" }}
                />
              }
            />
          </section>


          {today && (
            <AlmostOnList
              almost={today.almost}
              // Only the rows it shows — the whole score table would ship to the browser.
              rows={Object.fromEntries(today.almost.filter((a) => byCode[a.code]).map((a) => [a.code, byCode[a.code]]))}
            />
          )}

          <div className="sg-section">
            <SignalsChecks />
          </div>

          <HubLinks group="find" exclude={["/buy-sell-signals"]} />

          <p className="sg-note">
            <T
              en={
                <>
                  The list comes from company results, today&apos;s price and trading activity. It is not a prediction and
                  not investment advice, so please do your own research before you buy. See our{" "}
                  <a href="/disclaimer" className="font-semibold text-primary-ink hover:underline">
                    disclaimer
                  </a>
                  .
                </>
              }
              bn={
                <>
                  তালিকাটি কোম্পানির ফলাফল, আজকের দাম আর লেনদেন দেখে তৈরি। এটি ভবিষ্যদ্বাণী নয়, বিনিয়োগ পরামর্শও নয়, তাই
                  কেনার আগে নিজে যাচাই করে নিন। আরও জানতে{" "}
                  <a href="/disclaimer" className="font-semibold text-primary-ink hover:underline">
                    দায়মুক্তি
                  </a>{" "}
                  দেখুন।
                </>
              }
            />
          </p>
        </PageLockScope>
      </PersonalCodesProvider>
    </>
  );
}

/** The Premium card's rows: real counts from today's list, each beside the
 *  question Premium answers on this page. */
function signalQuestions(
  buy: ScoreItem[],
  info: SignalsToday["buys"],
  today: SignalsToday | null,
): PageQuestion[] {
  const rows: PageQuestion[] = [];
  if (buy.length > 0) {
    rows.push({
      key: "why",
      fact: { en: `${buy.length} on the list`, bn: `তালিকায় ${buy.length}টি` },
      tone: "good",
      ask: { en: "Why this one?", bn: "কেন এটি?" },
      hint: { en: "Three plain facts from its own report, for every share.", bn: "প্রতিটি শেয়ারের নিজের রিপোর্ট থেকে তিনটি সহজ তথ্য।" },
    });
    const near = buy.filter((i) => {
      const stop = info[i.trading_code]?.stop_above;
      return stop && i.ltp && i.ltp >= stop * 0.95;
    }).length;
    rows.push({
      key: "price",
      fact:
        near > 0
          ? { en: `${near} close to their limit`, bn: `${near}টি সীমার কাছাকাছি` }
          : { en: `${buy.length} Buys today`, bn: `আজ ${buy.length}টি কেনার সংকেত` },
      tone: near > 0 ? "fair" : "good",
      ask: { en: "Up to what price?", bn: "কোন দাম পর্যন্ত?" },
      hint: { en: "Our buy price, and the price where it stops being a Buy.", bn: "আমাদের কেনার দাম, আর কোন দামে এটি আর কেনার সংকেত থাকবে না।" },
    });
  }
  const priced = today?.almost.filter((a) => a.under != null).length ?? 0;
  const almost = today?.almost.length ?? 0;
  if (almost > 0) {
    rows.push({
      key: "almost",
      fact: { en: `${almost} good ones left out`, bn: `${almost}টি ভালো কোম্পানি বাদ` },
      tone: "neutral",
      ask: priced > 0 ? { en: "At what price do they come in?", bn: "কোন দামে তালিকায় আসবে?" } : { en: "Which ones, and why?", bn: "কোনগুলো, আর কেন?" },
      hint: { en: "The good companies almost on the list, closest first.", bn: "তালিকায় প্রায় ঢুকে যাওয়া ভালো কোম্পানি, সবচেয়ে কাছেরটি আগে।" },
    });
  }
  const moved = today?.changes && !today.changes.rebuilt ? today.changes.joined.length + today.changes.left.length : 0;
  rows.push({
    key: "alerts",
    fact:
      moved > 0
        ? { en: `${moved} changes since the last day`, bn: `আগের দিনের পর ${moved}টি বদল` }
        : { en: "Checked every trading day", bn: "প্রতি লেনদেনের দিন যাচাই" },
    tone: "neutral",
    ask: { en: "Will you hear first?", bn: "আপনি কি আগে জানবেন?" },
    hint: {
      en: "A note after the close when a share joins, or one you own or follow leaves or nears its limit.",
      bn: "লেনদেন শেষে একটি নোট, যখন কোনো শেয়ার তালিকায় আসে, বা আপনার কেনা বা অনুসরণ করা শেয়ার বাদ যায় বা সীমার কাছে পৌঁছায়।",
    },
  });
  return rows;
}
