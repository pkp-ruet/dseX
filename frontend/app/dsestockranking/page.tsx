import type { Metadata } from "next";
import { flattenTiers, getRankingsToday, getScores } from "@/lib/api";
import RankList, { type RankRow } from "@/components/ranking/RankList";
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import { IconArrowDown, IconArrowUp, IconCalendar, IconCheckCircle, IconChevron } from "@/components/ui/icons";
import { bnDate } from "@/lib/bn";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const TITLE = "Strongest Companies on the DSE: Company Ranking";
const DESC =
  "Every Dhaka Stock Exchange (DSE) listed company ranked by TopStockBD's in-depth fundamental analysis, with how many places each one moved this week. Open any company for the full analysis.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "DSE stock ranking",
    "DSE company ranking",
    "best companies DSE",
    "strongest companies Dhaka Stock Exchange",
    "DSE fundamental analysis",
    "top DSE stocks",
    "ডিএসই র‍্যাঙ্কিং",
    "সেরা কোম্পানি ডিএসই",
  ],
  alternates: { canonical: "/dsestockranking" },
  openGraph: {
    title: "Strongest companies on the DSE",
    description: DESC,
    url: "/dsestockranking",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Strongest companies on the DSE",
    description: DESC,
  },
};

/** "Thu 30 Oct" — the trading day a date names, in words. */
function dayLabel(iso: string, weekday = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString("en-GB", {
    ...(weekday ? { weekday: "short" as const } : {}),
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** The company ranking (simple leaderboard since 2026-11-01, user decision):
 *  rank, how far each company moved this week, the company. No groups, scores,
 *  filters or explanations — the analysis lives on each stock page. */
export default async function DseStockRankingPage() {
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page. The week's moves are secondary: without them the arrows don't show.
  const [scores, today] = await Promise.all([getScores(), getRankingsToday().catch(() => null)]);

  const moves = today?.moves ?? null;
  const newCodes = new Set(moves?.new ?? []);
  // Same order as the rank history: highest score first, ties by code.
  const rows: RankRow[] = flattenTiers(scores)
    .filter((i) => i.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.trading_code.localeCompare(b.trading_code))
    .map((i, idx) => ({
      rank: idx + 1,
      code: i.trading_code,
      name: i.company_name ?? i.trading_code,
      move: !moves ? null : newCodes.has(i.trading_code) ? "new" : moves.places[i.trading_code] ?? 0,
    }));

  const asOf = moves?.to ?? scores.computed_at ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dsestockranking`,
        url: `${BASE_URL}/dsestockranking`,
        name: TITLE,
        description: DESC,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "ItemList",
        name: "Strongest companies on the DSE",
        numberOfItems: rows.length,
        itemListElement: rows.slice(0, 20).map((r) => ({
          "@type": "ListItem",
          position: r.rank,
          name: r.name,
          url: `${BASE_URL}/stock/${r.code}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Company ranking", item: `${BASE_URL}/dsestockranking` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={
          asOf ? (
            <span className="rk-dateline">
              <i aria-hidden="true" />
              <T
                en={`Ranked after the close, ${dayLabel(asOf.slice(0, 10), true)}`}
                bn={`লেনদেন শেষে সাজানো, ${bnDate(asOf.slice(0, 10), true)}`}
              />
            </span>
          ) : undefined
        }
        title={<T en="Strongest companies on the DSE" bn="ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি" />}
        lead={
          <T
            en={`All ${rows.length} listed companies, ranked by our in-depth fundamental analysis of each business.`}
            bn={`তালিকাভুক্ত ${rows.length}টি কোম্পানি, প্রতিটি ব্যবসার গভীর ফান্ডামেন্টাল বিশ্লেষণ দেখে সাজানো।`}
          />
        }
      />

      <ul className="rk-badges">
        <li>
          <IconCheckCircle size={16} />
          <T en="In-depth fundamental analysis" bn="গভীর ফান্ডামেন্টাল বিশ্লেষণ" />
        </li>
        <li>
          <IconCalendar size={16} />
          <T en="Updated after every close" bn="প্রতিদিন লেনদেন শেষে হালনাগাদ" />
        </li>
      </ul>

      <div className="rk-note">
        <p className="rk-note-title">
          <T
            en="Tap any company to read our full analysis of it."
            bn="যেকোনো কোম্পানিতে চাপ দিন, তার পুরো বিশ্লেষণ পাবেন।"
          />
          <IconChevron size={16} />
        </p>
        <p className="rk-note-line">
          <T
            en="We check each company's profit, finances, business strength, price and dividends from its own reports. Its page shows what we found and why it ranks where it does."
            bn="প্রতিটি কোম্পানির নিজের রিপোর্ট থেকে আমরা মুনাফা, আর্থিক অবস্থা, ব্যবসার শক্তি, দাম আর ডিভিডেন্ড যাচাই করি। কোম্পানির পেজে দেখবেন আমরা কী পেয়েছি, আর সেটি কেন এই জায়গায়।"
          />
        </p>
        {moves && (
          <p className="rk-legend">
            <span className="rk-legend-key is-up" aria-hidden="true">
              <IconArrowUp size={12} />
            </span>
            <span className="rk-legend-key is-down" aria-hidden="true">
              <IconArrowDown size={12} />
            </span>
            <T
              en={`Places moved up or down since ${dayLabel(moves.from, true)}.`}
              bn={`${bnDate(moves.from, true)} থেকে কত ধাপ উঠেছে বা নেমেছে।`}
            />
          </p>
        )}
      </div>

      <RankList rows={rows} total={rows.length} />

      <p className="rk-foot">
        <T
          en="A high rank means a strong business, not a cheap share. This is not investment advice."
          bn="উঁচু র‍্যাঙ্ক মানে শক্তিশালী ব্যবসা, সস্তা শেয়ার নয়। এটি বিনিয়োগ পরামর্শ নয়।"
        />
      </p>
    </>
  );
}
