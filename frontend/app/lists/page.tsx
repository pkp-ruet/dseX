import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import PlaceSearch from "@/components/places/PlaceSearch";
import ScreenerClient from "@/components/screener/ScreenerClient";
import { PAGE_ICON } from "@/components/places/pageIcons";
import { IconAlert, IconChevronRight, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { flattenTiers, getBuyList, getScores, getScreener } from "@/lib/api";
import { applyScreen, EMPTY_SPEC, unpackRows } from "@/lib/screener";
import { REPORTS } from "@/lib/research-reports";
import { pageByKey, type Bi } from "@/lib/places";

/**
 * Lists: find your next share (2026-11-25).
 *
 * Step 4 of the simplify review (https://claude.ai/artifact/VG8A1sU8F5q9grFDCsrHnb)
 * put every way of finding shares here; the same day the page was simplified
 * (user: "this page's main goal is help user to find their next stock. how can
 * we simplify this page", then "Yes, build it" on
 * https://claude.ai/artifact/LDm2G5YPtfgsXey7wKVNVv). Two ways in:
 *
 * - **Start here**: Today's Buy List (the one gold card, the only list that
 *   says buy), All companies and For you.
 * - **What do you want from a share?**: six wants (`lib/wants.ts`) holding the
 *   16 ready lists; a card opens its first list in the pop-up, the want's
 *   other lists are chips in the bar, and the report or page on the same
 *   subject (Results, four of the reports) sits under the list.
 *
 * Then one line, "Before you buy", for the two reports about trouble. The
 * research section, the tools (Compare, Portfolio builder: in the menu and
 * where they are used), "See every share" (All companies has the same boxes),
 * "How we pick each list" (each list has its own) and "Check my shares" (it
 * opens from My shares, `?mine=1`) left the page. 32 things to tap became 12.
 *
 * The ready lists' figures are the primary fetch (a throw keeps the last good
 * page, SEO rule 4); every count beside a list is secondary.
 */
export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const URL = `${BASE_URL}/lists`;
const TITLE = "DSE Stock Lists: Buy List, Ranking, Dividend, Low P/E and 52-Week Lists";
const DESCRIPTION =
  "Find your next Dhaka Stock Exchange (DSE) share: the shares we would buy today, every company ranked by strength, and lists by what you want from a share: good cash dividends, cheap for what it earns, profit growing, big and steady, owners buying, near the 52-week high or low. Narrow any list by sector or share price. Updated after every trading day.";

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

/** A row in the Start here card: icon · name (+ crown) · line · count · chevron. */
function ListLink({
  href,
  icon,
  name,
  line,
  count,
  premium,
  card,
}: {
  href: string;
  icon: ReactNode;
  name: Bi;
  line: Bi;
  count?: { value: number | string; unit: Bi } | null;
  premium?: boolean;
  card: string;
}) {
  return (
    <li>
      <Link href={href} className="ls-row" data-card={card}>
        <span className="ls-row-ic" aria-hidden="true">{icon}</span>
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
  const [data, buyList, scores] = await Promise.all([
    getScreener(),
    getBuyList().catch(() => null),
    getScores().catch(() => null),
  ]);
  const biggest = applyScreen(unpackRows(data), EMPTY_SPEC).slice(0, 20);
  const graded = scores ? flattenTiers(scores).filter((r) => r.score != null).length : 0;
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
          title={<T en="Find your next share" bn="পরের শেয়ারটি খুঁজুন" />}
          lead={
            <T
              en={`Start with our picks, or with what you want from a share. We check all ${data.rows.length} shares after every close.`}
              bn={`আমাদের বাছাই দিয়ে শুরু করুন, অথবা শেয়ারে আপনি যা চান সেখান থেকে। প্রতিদিন বাজার বন্ধের পর আমরা ${data.rows.length}টি শেয়ারই যাচাই করি।`}
            />
          }
        />
        <PlaceSearch />
      </div>

      {/* Start here: the Buy List (the only list that says buy), All companies, For you. */}
      <section className="ls-sec" id="start" aria-labelledby="ls-start-h">
        <h2 id="ls-start-h" className="ls-h"><T en="Start here" bn="এখান থেকে শুরু করুন" /></h2>
        <div className="ls-start">
          <Link href="/buy-list" className="ls-pick" data-card="lists-buylist">
            <span className="ls-pick-k">
              <span className="ls-crown"><IconCrown size={12} /><T en="Premium" bn="প্রিমিয়াম" /></span>
              {" · "}
              <T en="the only list that says buy" bn="একমাত্র তালিকা যা কেনার কথা বলে" />
            </span>
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
          <ul className="ls-rows">
            <ListLink
              href="/dsestockranking"
              card="lists-companies"
              icon={icon("companies")}
              name={page("companies").name}
              line={{ en: "Every company, ranked by how strong its business is", bn: "সব কোম্পানি, ব্যবসা কতটা শক্তিশালী সেই অনুযায়ী সাজানো" }}
              count={graded ? { value: graded, unit: { en: " ranked", bn: "টি র‍্যাঙ্ক করা" } } : null}
            />
            <ListLink
              href="/for-you"
              card="lists-foryou"
              icon={icon("foryou")}
              name={page("foryou").name}
              line={{ en: "Companies like the ones you own or follow", bn: "আপনার কেনা বা নজরে রাখা শেয়ারের মতো কোম্পানি" }}
              premium
            />
          </ul>
        </div>
      </section>

      {/* What do you want from a share? The six wants holding the 16 ready lists. */}
      <ScreenerClient data={data} />

      {/* Before you buy: the two reports about trouble. `#research` is where a report's eyebrow lands. */}
      <p className="ls-careful" id="research">
        <span className="ls-careful-ic" aria-hidden="true"><IconAlert size={16} /></span>
        <span>
          <T
            en={
              <>
                Before you buy, see which <Link href="/stock-insights/risk-register" data-card="lists-risks">companies are in trouble</Link> and
                which got an <Link href="/stock-insights/auditor-warnings" data-card="lists-auditors">auditor&apos;s warning</Link>.
              </>
            }
            bn={
              <>
                কেনার আগে দেখে নিন কোন <Link href="/stock-insights/risk-register" data-card="lists-risks">কোম্পানি সমস্যায় আছে</Link>,
                আর কোনটি <Link href="/stock-insights/auditor-warnings" data-card="lists-auditors">নিরীক্ষকের সতর্কতা</Link> পেয়েছে।
              </>
            }
          />
        </span>
      </p>

      <p className="ls-foot">
        <T
          en="A list is a starting point for your own research, not advice to buy. Only the Buy List says what we would buy."
          bn="তালিকা আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়। আমরা কী কিনতাম, তা শুধু কেনার তালিকা বলে।"
        />
      </p>
    </div>
  );
}
