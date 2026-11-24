import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import PlaceSearch from "@/components/places/PlaceSearch";
import ScreenerClient from "@/components/screener/ScreenerClient";
import { PAGE_ICON } from "@/components/places/pageIcons";
import { REPORT_ICON } from "@/components/research-reports/reportIcons";
import { IconChevronRight, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { flattenTiers, getBuyList, getLatestResults, getResearchSummary, getScores, getScreener } from "@/lib/api";
import { applyScreen, EMPTY_SPEC, unpackRows } from "@/lib/screener";
import { REPORTS, reportStat } from "@/lib/research-reports";
import { pageByKey, type Bi } from "@/lib/places";

/**
 * Lists (2026-11-25, step 4 of the simplify review
 * https://claude.ai/artifact/VG8A1sU8F5q9grFDCsrHnb, idea 4 "One place to
 * find shares"). The page the bottom bar's Lists tab opens: every way of
 * finding shares, each opened the same way (`components/lists/ListView.tsx`
 * on a list's own page, the same bar and rows in the pop-up here).
 *
 * Our pick (the Buy List, the only list that says buy) · our lists (For you,
 * All companies, Results) · the 16 ready lists (the screener until today:
 * tiles that open a pop-up list) · our research (six reports) · two tools.
 * The Buy List, All companies, Results, For you and the reports keep their
 * own addresses; /find, /screener and the research hub 301 here.
 *
 * The ready lists' figures are the primary fetch (a throw keeps the last good
 * page, SEO rule 4); every count beside a list is secondary.
 */
export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const URL = `${BASE_URL}/lists`;
const TITLE = "DSE Stock Lists: Buy List, Ranking, Results, Screener and Research";
const DESCRIPTION =
  "Every list of Dhaka Stock Exchange (DSE) shares in one place: the shares we would buy today, every company ranked by strength, the latest results, ready lists such as near the 52-week high or low, lowest P/E and highest dividend, and research on the whole market. Narrow any list by sector or share price. Updated after every trading day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE stock screener",
    "DSE stock list",
    "best DSE shares",
    "DSE company ranking",
    "low PE stocks DSE",
    "high dividend yield stocks Bangladesh",
    "DSE 52 week high",
    "DSE 52 week low",
    "DSE stocks below book value",
    "which share to buy in Bangladesh",
    "শেয়ার স্ক্রিনার",
    "শেয়ারের তালিকা",
  ],
  alternates: { canonical: URL },
  openGraph: { title: `${TITLE} | TopStockBD`, description: DESCRIPTION, url: URL, type: "website" },
};

const n = (v: number, one: string, many: string) => (v === 1 ? one : many);

/** A row in one of the page's cards: icon · name (+ crown) · line · count · chevron. */
function ListLink({
  href,
  icon,
  name,
  line,
  count,
  premium,
  gold,
  card,
}: {
  href: string;
  icon: ReactNode;
  name: Bi;
  line: Bi;
  count?: { value: number | string; unit: Bi } | null;
  premium?: boolean;
  gold?: boolean;
  card: string;
}) {
  return (
    <li>
      <Link href={href} className="ls-row" data-card={card}>
        <span className={`ls-row-ic${gold ? " ls-row-ic--gold" : ""}`} aria-hidden="true">{icon}</span>
        <span className="ls-row-main">
          <span className="ls-row-t">
            <T en={name.en} bn={name.bn} />
            {premium && (
              <span className="ls-crown" title="Premium">
                <IconCrown size={12} />
                <span className="sr-only">Premium</span>
              </span>
            )}
          </span>
          <span className="ls-row-l"><T en={line.en} bn={line.bn} /></span>
        </span>
        <span className="ls-row-n nums">
          {count ? (
            <>
              <b>{count.value}</b>
              <T en={count.unit.en} bn={count.unit.bn} />
            </>
          ) : null}
        </span>
        <span className="ls-row-go" aria-hidden="true"><IconChevronRight size={16} /></span>
      </Link>
    </li>
  );
}

export default async function ListsPage() {
  // The ready lists are the page's main content: no catch (SEO rule 4).
  const [data, buyList, scores, results, research] = await Promise.all([
    getScreener(),
    getBuyList().catch(() => null),
    getScores().catch(() => null),
    getLatestResults(3600).catch(() => null),
    getResearchSummary().catch(() => null),
  ]);
  const biggest = applyScreen(unpackRows(data), EMPTY_SPEC).slice(0, 20);
  const graded = scores ? flattenTiers(scores).filter((r) => r.score != null).length : 0;
  const reports = results?.results.length ?? 0;
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const reportsWeek = results?.results.filter((r) => r.post_date >= weekAgo).length ?? 0;
  const buy = buyList?.count ?? null;
  const joined = buyList?.changes.week_joined.length ?? 0;

  const page = (k: string) => pageByKey(k);
  const icon = (k: string) => {
    const I = PAGE_ICON[k];
    return I ? <I size={18} /> : null;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": URL,
        url: URL,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: ["en", "bn"],
        isPartOf: { "@id": BASE_URL },
        // The shares on our lists are Premium: in the HTML, hidden for other readers.
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Lists", item: URL },
        ],
      },
      {
        "@type": "ItemList",
        name: "Lists of DSE shares",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today's Buy List", url: `${BASE_URL}/buy-list` },
          { "@type": "ListItem", position: 2, name: "Strongest companies on the DSE", url: `${BASE_URL}/dsestockranking` },
          { "@type": "ListItem", position: 3, name: "Latest results", url: `${BASE_URL}/results` },
          ...REPORTS.map((r, i) => ({
            "@type": "ListItem",
            position: 4 + i,
            name: r.title.en,
            url: `${BASE_URL}/stock-insights/${r.slug}`,
          })),
        ],
      },
      ...(biggest.length
        ? [{
            "@type": "ItemList",
            name: "Largest DSE companies by market cap",
            numberOfItems: biggest.length,
            itemListElement: biggest.map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: r.name,
              url: `${BASE_URL}/stock/${encodeURIComponent(r.code)}`,
            })),
          }]
        : []),
    ],
  };

  return (
    <div className="ls-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="space-y-4">
        <PageHeader
          title={<T en="Lists" bn="তালিকা" />}
          lead={
            <T
              en={`Every list of DSE shares in one place. Each one opens the same way: narrow it by sector or share price, and sort it. We check all ${data.rows.length} shares after every close.`}
              bn={`ডিএসইর শেয়ারের সব তালিকা এক জায়গায়। প্রতিটি একইভাবে খোলে: সেক্টর বা শেয়ারের দাম দিয়ে বাছাই করুন, পছন্দমতো সাজান। প্রতিদিন বাজার বন্ধের পর আমরা ${data.rows.length}টি শেয়ারই যাচাই করি।`}
            />
          }
        />
        <PlaceSearch />
      </div>

      {/* Our pick: the only list that says buy. */}
      <section className="ls-sec" id="our-pick" aria-labelledby="ls-pick-h">
        <h2 id="ls-pick-h" className="ls-h">
          <T en="Our pick" bn="আমাদের বাছাই" />
          <span className="ls-crown"><IconCrown size={12} /><T en="Premium" bn="প্রিমিয়াম" /></span>
        </h2>
        <Link href="/buy-list" className="ls-pick" data-card="lists-buylist">
          <span className="ls-pick-k"><T en="The only list that says buy" bn="একমাত্র তালিকা যা কেনার কথা বলে" /></span>
          <span className="ls-pick-t"><T en="Today's Buy List" bn="আজকের কেনার তালিকা" /></span>
          <span className="ls-pick-l">
            {buy != null ? (
              <T
                en={`Strong companies under our fair price, with nothing seriously wrong.${joined ? ` ${joined} joined this week.` : ""}`}
                bn={`শক্তিশালী কোম্পানি, দাম আমাদের ন্যায্য দামের নিচে, গুরুতর কোনো সমস্যা নেই।${joined ? ` এ সপ্তাহে ${joined}টি যোগ হয়েছে।` : ""}`}
              />
            ) : (
              <T en="The shares we would buy today, checked after every close." bn="আজ যে শেয়ারগুলো আমরা কিনতাম, প্রতিদিন বাজার বন্ধের পর যাচাই করা।" />
            )}
          </span>
          {buy != null && (
            <span className="ls-pick-n nums">
              <b>{buy}</b>
              <T en={n(buy, "share", "shares")} bn="টি শেয়ার" />
            </span>
          )}
        </Link>
      </section>

      {/* Our three lists of companies. */}
      <section className="ls-sec" id="companies" aria-labelledby="ls-co-h">
        <h2 id="ls-co-h" className="ls-h"><T en="Companies to look at" bn="দেখার মতো কোম্পানি" /></h2>
        <ul className="ls-rows">
          <ListLink
            href="/for-you"
            card="lists-foryou"
            icon={icon("foryou")}
            name={page("foryou").name}
            line={{ en: "Companies like the ones you own, follow or read about", bn: "আপনার কেনা, নজরে রাখা বা পড়ে দেখা শেয়ারের মতো কোম্পানি" }}
            premium
          />
          <ListLink
            href="/dsestockranking"
            card="lists-companies"
            icon={icon("companies")}
            name={page("companies").name}
            line={page("companies").line}
            count={graded ? { value: graded, unit: { en: " ranked", bn: "টি র‍্যাঙ্ক করা" } } : null}
          />
          <ListLink
            href="/results"
            card="lists-results"
            icon={icon("results")}
            name={page("results").name}
            line={
              reportsWeek
                ? { en: `Each company's latest profit. ${reportsWeek} posted this week.`, bn: `প্রতিটি কোম্পানির সর্বশেষ মুনাফা। এ সপ্তাহে ${reportsWeek}টি এসেছে।` }
                : page("results").line
            }
            count={reports ? { value: reports, unit: { en: " reports", bn: "টি রিপোর্ট" } } : null}
          />
        </ul>
      </section>

      {/* The 16 ready lists (the screener until 2026-11-25): tiles, a tap opens the list. */}
      <ScreenerClient data={data} />

      {/* Our research: six reports, each opens as a list with its numbers on top. */}
      <section className="ls-sec" id="research" aria-labelledby="ls-rr-h">
        <h2 id="ls-rr-h" className="ls-h">
          <T en="Our research" bn="আমাদের গবেষণা" />
          <span className="ls-crown"><IconCrown size={12} /><T en="Premium" bn="প্রিমিয়াম" /></span>
        </h2>
        <p className="ls-h-note">
          <T
            en="Six reports on the whole market. Each opens as a list, with its key numbers free."
            bn="পুরো বাজার নিয়ে ছয়টি রিপোর্ট। প্রতিটি তালিকা হিসেবে খোলে, মূল সংখ্যাগুলো ফ্রি।"
          />
        </p>
        <ul className="ls-rows">
          {REPORTS.map((r) => {
            const I = REPORT_ICON[r.slug];
            const stat = reportStat(r.slug, research);
            return (
              <ListLink
                key={r.slug}
                href={`/stock-insights/${r.slug}`}
                card={`lists-report-${r.slug}`}
                icon={<I size={18} />}
                gold
                name={r.title}
                line={stat ? { en: `${stat.value.en} ${stat.label.en}`, bn: `${stat.value.bn} ${stat.label.bn}` } : r.question}
              />
            );
          })}
        </ul>
      </section>

      {/* Two tools, reached here and where they are needed. */}
      <section className="ls-sec" id="tools" aria-labelledby="ls-tools-h">
        <h2 id="ls-tools-h" className="ls-h"><T en="Tools" bn="টুল" /></h2>
        <ul className="ls-rows">
          {(["compare", "builder"] as const).map((k) => {
            const p = page(k);
            return (
              <ListLink key={k} href={p.href} card={`lists-${k}`} icon={icon(k)} name={p.name} line={p.line} />
            );
          })}
        </ul>
      </section>

      <p className="ls-foot">
        <T
          en="A list is a starting point for your own research, not advice to buy. Only the Buy List says what we would buy."
          bn="তালিকা আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়। আমরা কী কিনতাম, তা শুধু কেনার তালিকা বলে।"
        />
      </p>
    </div>
  );
}
