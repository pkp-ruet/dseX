import type { Metadata } from "next";
import PageGuide from "@/components/seo/PageGuide";
import Link from "next/link";
import { flattenTiers, getMarketIndex, getScores } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { PILLARS } from "@/lib/landing";
import RankingExplorer from "@/components/ranking/RankingExplorer";
import type { RankedItem } from "@/components/ranking/FullRankTable";
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import Stat from "@/components/ui/Stat";
import HubLinks from "@/components/layout/HubLinks";
import { bnDate } from "@/lib/bn";

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
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const [scores, marketIndex] = await Promise.all([
    getScores(),
    getMarketIndex().catch(() => null),
  ]);

  const { tiers } = scores;

  const updated = fmtDate(scores.computed_at);
  const updatedBn = scores.computed_at ? bnDate(scores.computed_at) : null;

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
  const priceDateBn = marketIndex?.date ? bnDate(marketIndex.date) : null;
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
        // The whole ranking is free since 2026-10-29 (the Free vs Premium plan):
        // no paywall markup. Only a row's signal reason, opened on a tap, is Premium.
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
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="DSE stock rankings" bn="ডিএসই শেয়ার র‍্যাঙ্কিং" />}
        lead={
          <T
            en="Every company on the Dhaka Stock Exchange, scored on how strong its business is, then ranked from strongest to weakest."
            bn="ঢাকা স্টক এক্সচেঞ্জের প্রতিটি কোম্পানি, ব্যবসা কতটা শক্তিশালী তা দেখে স্কোর দেওয়া, তারপর সবচেয়ে শক্ত থেকে সবচেয়ে দুর্বল ক্রমে সাজানো।"
          />
        }
        actions={
          <div className="flex gap-8 sm:gap-10" aria-label="Coverage">
            <Stat value={allRanked.length} label={<T en="Companies scored" bn="স্কোর পাওয়া কোম্পানি" />} size="xl" />
            <Stat value={sectors.length} label={<T en="Sectors" bn="সেক্টর" />} size="xl" />
          </div>
        }
      />

      {/* Method + data vintage on ONE quiet line — what the score is made of and
          how fresh it is. The written-out method lives on /about. */}
      <section className="rk-method" aria-label="How the score is built">
        <p className="rk-method-checks">
          <T
            en={
              <>
                Five checks on every company: <b>{PILLARS.map((p) => p.en).join(" · ")}</b>
              </>
            }
            bn={
              <>
                প্রতিটি কোম্পানিতে পাঁচটি যাচাই: <b>{PILLARS.map((p) => p.bn).join(" · ")}</b>
              </>
            }
          />
        </p>
        {(priceDate || latestFy || updated) && (
          <p className="rk-method-dates nums">
            <T
              en={[
                priceDate && `Prices ${priceDate}`,
                latestFy && `Accounts up to FY${latestFy}`,
                updated && `Updated ${updated}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              bn={[
                priceDateBn && `দাম ${priceDateBn}`,
                latestFy && `${latestFy} অর্থবছর পর্যন্ত হিসাব`,
                updatedBn && `হালনাগাদ ${updatedBn}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </p>
        )}
        <Link prefetch={false} href="/about" className="rk-method-link">
          <T en="How we score" bn="আমরা কীভাবে স্কোর দিই" /> <span aria-hidden>→</span>
        </Link>
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
        <h2 className="rank-limits-title">
          <T en="What this list covers" bn="এই তালিকায় কী আছে" />
        </h2>
        <ul className="rank-limits-points">
          <li className="rank-limits-point">
            <T
              en={
                <>
                  Companies are ranked on how strong the business is, so <b>this is not a buy list</b>. A strong
                  company can still be a poor buy at today&apos;s price; the <b>Price today</b> column shows which
                  way the price leans.
                </>
              }
              bn={
                <>
                  কোম্পানিগুলো ব্যবসা কতটা শক্তিশালী তা দেখে সাজানো, তাই <b>এটি কেনার তালিকা নয়</b>। শক্তিশালী
                  কোম্পানিও আজকের দামে কেনার জন্য ভালো না-ও হতে পারে; <b>আজকের দাম</b> কলামে দেখা যায় দাম
                  কোন দিকে।
                </>
              }
            />
          </li>
          <li className="rank-limits-point">
            <T
              en="Bonds, debentures, mutual funds and ETFs are not scored, so they do not appear here."
              bn="বন্ড, ডিবেঞ্চার, মিউচুয়াল ফান্ড আর ইটিএফের স্কোর হয় না, তাই এগুলো এখানে নেই।"
            />
          </li>
          {staleCount > 0 && (
            <li className="rank-limits-point">
              <T
                en={
                  <>
                    <b>{staleCount}</b> {staleCount === 1 ? "company has" : "companies have"} not published a
                    recent annual report. They carry an &ldquo;Old report&rdquo; tag, and their score is lowered
                    for it.
                  </>
                }
                bn={
                  <>
                    <b>{staleCount}</b>টি কোম্পানি সাম্প্রতিক বার্ষিক রিপোর্ট প্রকাশ করেনি। এদের পাশে
                    &ldquo;পুরোনো রিপোর্ট&rdquo; লেখা থাকে, আর এ কারণে স্কোর কমানো হয়।
                  </>
                }
              />
            </li>
          )}
          {zCount > 0 && (
            <li className="rank-limits-point">
              <T
                en={
                  <>
                    <b>{zCount}</b> Z category {zCount === 1 ? "company is" : "companies are"} scored lower for
                    irregular dividends and extra trading limits.
                  </>
                }
                bn={
                  <>
                    অনিয়মিত ডিভিডেন্ড আর লেনদেনের বাড়তি সীমার কারণে Z ক্যাটাগরির <b>{zCount}</b>টি কোম্পানির
                    স্কোর কমানো হয়েছে।
                  </>
                }
              />
            </li>
          )}
          <li className="rank-limits-point">
            <T
              en="Everything comes from published company reports and daily DSE prices. The same rules apply to every company, and nobody can pay to rank higher."
              bn="সব তথ্য আসে প্রকাশিত কোম্পানি রিপোর্ট আর ডিএসইর প্রতিদিনের দাম থেকে। প্রতিটি কোম্পানির জন্য একই নিয়ম, আর টাকা দিয়ে কেউ র‍্যাঙ্ক বাড়াতে পারে না।"
            />
          </li>
        </ul>
        <p className="rank-limits-note">
          <T
            en="This is for learning, not investment advice. Please do your own checking before you buy or sell."
            bn="এটি শেখার জন্য, বিনিয়োগ পরামর্শ নয়। কেনা বা বেচার আগে নিজে যাচাই করে নিন।"
          />
        </p>
      </section>

      <HubLinks group="find" exclude={["/dsestockranking"]} />

      <PageGuide
        title="How the DSE stock ranking works"
        titleBn="ডিএসই শেয়ার র‍্যাঙ্কিং কীভাবে কাজ করে"
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
            The same rules apply to all {allRanked.length} companies, with one exception: banks, finance companies
            and insurers are judged on measures that fit a lender or an insurer, such as their own capital, interest
            margin and net margin, instead of loan ratios that mean little for them. A company whose latest annual
            report is two or more years old is scored lower, and DSE&apos;s Z category listings are scored lower for
            irregular dividends.
          </>,
          <>
            A high rank means a strong business, not a cheap share. Whether today&apos;s price is attractive is a
            separate question, answered on each company page by the price check and the Buy or Sell signal, and
            across the market on <Link href="/buy-sell-signals">Buy signals</Link>. Nobody can pay to move up this
            list.
          </>,
        ]}
        introBn={[
          <>
            এটি <b>ঢাকা স্টক এক্সচেঞ্জের প্রতিটি চালু কোম্পানির র‍্যাঙ্কিং, ব্যবসা কতটা শক্তিশালী তা অনুযায়ী</b>,
            সবচেয়ে শক্ত থেকে সবচেয়ে দুর্বল পর্যন্ত, প্রতি লেনদেনের দিনের পর নতুন করে তৈরি। প্রতিটি কোম্পানি তার
            প্রকাশিত হিসাবের পাঁচটি যাচাই থেকে 100-এর মধ্যে স্কোর পায়: মুনাফার মান (30%), আর্থিক অবস্থা (20%),
            ব্যবসার শক্তি (20%), সেক্টরের তুলনায় দাম (15%) আর ডিভিডেন্ড দেওয়ার সামর্থ্য (15%)। 75 বা তার বেশি স্কোর
            চমৎকার, 60 থেকে 74 ভালো, 45 থেকে 59 মাঝারি, আর 45-এর নিচে দুর্বল।
          </>,
          <>
            {allRanked.length}টি কোম্পানির জন্যই একই নিয়ম, শুধু একটি ব্যতিক্রম: ব্যাংক, আর্থিক প্রতিষ্ঠান আর বিমা
            কোম্পানিকে এমন মাপকাঠিতে দেখা হয় যা ঋণদাতা বা বিমাকারীর জন্য মানানসই, যেমন নিজের মূলধন, সুদের মার্জিন
            আর নেট মার্জিন। ঋণের অনুপাত এদের জন্য তেমন অর্থ বহন করে না। যে কোম্পানির সর্বশেষ বার্ষিক রিপোর্ট দুই বা
            তার বেশি বছরের পুরোনো, তার স্কোর কমানো হয়, আর অনিয়মিত ডিভিডেন্ডের জন্য ডিএসইর Z ক্যাটাগরির কোম্পানির
            স্কোরও কমে।
          </>,
          <>
            উঁচু র‍্যাঙ্ক মানে শক্তিশালী ব্যবসা, সস্তা শেয়ার নয়। আজকের দাম আকর্ষণীয় কি না, সেটি আলাদা প্রশ্ন। এর
            উত্তর আছে প্রতিটি কোম্পানির পেজে দামের যাচাই আর কেনা বা বেচার সংকেতে, আর পুরো বাজারের জন্য{" "}
            <Link href="/buy-sell-signals">কেনার সংকেত</Link> পেজে। টাকা দিয়ে কেউ এই তালিকায় ওপরে উঠতে পারে না।
          </>,
        ]}
        faq={[
          {
            q: "What is the TopStockBD fundamental score?",
            a: "A score from 0 to 100 that TopStockBD works out from a company's published financial statements and DSE prices, using five weighted checks: earnings quality, financial health, competitive strength, valuation and dividend sustainability. It measures how strong the business is, not how fast the price is moving.",
            qBn: "TopStockBD-এর ফান্ডামেন্টাল স্কোর কী?",
            aBn: "0 থেকে 100-এর একটি স্কোর, যা TopStockBD কোম্পানির প্রকাশিত আর্থিক হিসাব আর ডিএসইর দাম থেকে পাঁচটি যাচাইয়ের মাধ্যমে হিসাব করে: মুনাফার মান, আর্থিক অবস্থা, ব্যবসার শক্তি, দাম আর ডিভিডেন্ড দেওয়ার সামর্থ্য। এটি ব্যবসা কতটা শক্তিশালী তা মাপে, দাম কত দ্রুত বাড়ছে তা নয়।",
          },
          {
            q: "Does an Excellent rank mean I should buy the share?",
            a: "No. The rank describes the company, and the price is judged separately. A strong company can be expensive. The site shows a Buy signal only when the grade is Good or Excellent, the price is reasonable, the share trades enough to sell easily, and profit has not just dropped sharply.",
            qBn: "চমৎকার র‍্যাঙ্ক মানেই কি শেয়ারটি কেনা উচিত?",
            aBn: "না। র‍্যাঙ্ক কোম্পানির কথা বলে, দাম আলাদাভাবে বিচার করা হয়। শক্তিশালী কোম্পানির দামও বেশি হতে পারে। সাইটে কেনার সংকেত আসে তখনই, যখন গ্রেড ভালো বা চমৎকার, দাম যুক্তিসংগত, সহজে বিক্রি করার মতো লেনদেন হয়, আর মুনাফা সম্প্রতি অনেক কমেনি।",
          },
          {
            q: "How often is the DSE stock ranking updated?",
            a: "Prices and signals refresh after every trading day closes at 2:30 PM. Scores change when a company publishes new annual or quarterly figures, and the whole list is worked out again each day, so a new filing shows up the next morning.",
            qBn: "ডিএসই শেয়ার র‍্যাঙ্কিং কত ঘন ঘন হালনাগাদ হয়?",
            aBn: "প্রতি লেনদেনের দিন দুপুর 2:30-এ বাজার বন্ধের পর দাম আর সংকেত হালনাগাদ হয়। কোম্পানি নতুন বার্ষিক বা প্রান্তিকের হিসাব প্রকাশ করলে স্কোর বদলায়, আর পুরো তালিকা প্রতিদিন নতুন করে হিসাব হয়, তাই নতুন হিসাব পরদিন সকালেই দেখা যায়।",
          },
          {
            q: "Which stocks are not ranked?",
            a: "Mutual funds, bonds, debentures and ETFs, because they have no business earnings to score. Companies that have never published an annual report on DSE are also left out until they do.",
            qBn: "কোন শেয়ারগুলো র‍্যাঙ্কিংয়ে নেই?",
            aBn: "মিউচুয়াল ফান্ড, বন্ড, ডিবেঞ্চার আর ইটিএফ, কারণ এদের স্কোর করার মতো ব্যবসার মুনাফা নেই। যে কোম্পানি ডিএসইতে কখনো বার্ষিক রিপোর্ট প্রকাশ করেনি, সেটিও প্রকাশ না করা পর্যন্ত বাদ থাকে।",
          },
        ]}
      />
    </>
  );
}
