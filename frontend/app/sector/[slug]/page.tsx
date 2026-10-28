import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSectorDetail, getSectorSlugs, ApiNotFoundError } from "@/lib/api";
import { crore, pct } from "@/lib/formatters";
import SectorHero from "@/components/sector/SectorHero";
import SectorVsMarket from "@/components/sector/SectorVsMarket";
import SectorHighlights from "@/components/sector/SectorHighlights";
import SectorStockTable from "@/components/sector/SectorStockTable";
import SectorScoringNote from "@/components/sector/SectorScoringNote";
import SectorCard from "@/components/sector/SectorCard";
import PageGuide from "@/components/seo/PageGuide";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import { croreBn, sectorBn } from "@/lib/bn";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getSectorSlugs().catch(() => [] as string[]);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Only a real 404 falls back; any other failure throws so a transient
  // backend error can't be cached as a page with no title or description.
  const data = await getSectorDetail(slug).catch((err) => {
    if (err instanceof ApiNotFoundError) return null;
    throw err;
  });
  if (!data) return {};

  const s = data.summary;
  const title = `${s.sector} Sector — DSE Share Prices, P/E, Dividend Yield & Rankings`;
  const description =
    `All ${s.company_count} ${s.sector.toLowerCase()} companies on the Dhaka Stock Exchange, ranked by fundamental score. ` +
    `Median P/E ${s.median_pe != null ? s.median_pe.toFixed(1) : "n/a"}, median dividend yield ` +
    `${s.median_yield_pct != null ? `${s.median_yield_pct.toFixed(1)}%` : "n/a"}, with prices, ` +
    `7-day moves and how the sector compares to the whole market.`;

  return {
    title,
    description,
    keywords: [
      `${s.sector} sector DSE`,
      `${s.sector} stocks Bangladesh`,
      `${s.sector} share price DSE`,
      `${s.sector} sector share list`,
      `${s.sector} companies in Bangladesh stock market`,
      `best ${s.sector.toLowerCase()} stocks DSE`,
      `${s.sector} sector P/E`,
      `${s.sector} dividend yield`,
      "DSE sector analysis",
      "Dhaka Stock Exchange sectors",
    ],
    alternates: { canonical: `/sector/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/sector/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${s.sector} Sector — DSE`,
      description: `${s.company_count} companies, median score ${s.median_score ?? "—"}/100.`,
    },
  };
}

export default async function SectorPage({ params }: Props) {
  const { slug } = await params;

  // Any failure but a 404 throws: ISR then keeps serving the last good page.
  const data = await getSectorDetail(slug).catch((err) => {
    if (err instanceof ApiNotFoundError) notFound();
    throw err;
  });

  const s = data.summary;
  const nameBn = sectorBn(s.sector);
  const peWord =
    s.median_pe != null && data.market.median_pe != null
      ? s.median_pe < data.market.median_pe * 0.85
        ? "below"
        : s.median_pe > data.market.median_pe * 1.15
          ? "above"
          : "close"
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/sector/${slug}`,
        url: `${BASE_URL}/sector/${slug}`,
        name: `${s.sector} Sector — Dhaka Stock Exchange`,
        description:
          `All ${s.company_count} ${s.sector.toLowerCase()} companies listed on DSE, with median P/E, ` +
          `dividend yield and fundamental scores.`,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Sectors", item: `${BASE_URL}/sectors` },
          {
            "@type": "ListItem",
            position: 3,
            name: s.sector,
            item: `${BASE_URL}/sector/${slug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${s.sector} companies on DSE, by fundamental score`,
        numberOfItems: data.stocks.length,
        itemListElement: data.stocks.slice(0, 25).map((stock, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: stock.company_name || stock.trading_code,
          url: `${BASE_URL}/stock/${stock.trading_code}`,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        eyebrow={
          <Link href="/sectors" className="hover:underline">
            <T en="DSE sectors" bn="ডিএসই সেক্টর" />
          </Link>
        }
        title={<T en={s.sector} bn={nameBn} />}
        lead={
          <T
            en="Every company in this sector on one page, with prices, scores and a comparison with the whole market."
            bn="এই সেক্টরের সব কোম্পানি এক পেজে: দাম, স্কোর আর পুরো বাজারের সঙ্গে তুলনা।"
          />
        }
        actions={
          <span className="ms-page-date">
            <T
              en={`${s.company_count} companies · ${crore(s.total_mcap_mn)} · middle score ${s.median_score != null ? s.median_score.toFixed(1) : "—"}`}
              bn={`${s.company_count}টি কোম্পানি · ${croreBn(s.total_mcap_mn)} · মধ্যম স্কোর ${s.median_score != null ? s.median_score.toFixed(1) : "—"}`}
            />
          </span>
        }
      />

      <SectorHero summary={s} />

      <SectorVsMarket
        rows={data.comparison}
        summary={s}
        marketCount={data.market.company_count}
      />

      <SectorHighlights
        gainers={data.gainers}
        losers={data.losers}
        weekLeaders={data.week_leaders}
        topDividend={data.top_dividend}
      />

      <SectorStockTable stocks={data.stocks} sectorName={s.sector} />

      <SectorScoringNote note={data.scoring_note} sectorName={s.sector} />

      <PageGuide
        title={`About the ${s.sector} sector on DSE`}
        titleBn={`ডিএসইর ${nameBn} সেক্টর সম্পর্কে`}
        intro={[
          <>
            The <b>{s.sector.toLowerCase()} sector of the Dhaka Stock Exchange</b> has {s.company_count} scored
            {s.company_count === 1 ? " company" : " companies"}
            {s.total_mcap_mn != null ? <> worth {crore(s.total_mcap_mn)} together</> : null}
            {data.market.company_count ? <>, out of {data.market.company_count} scored companies on the exchange</> : null}.
            The table above lists every one with its official closing share price, the day&apos;s change, EPS,
            dividend yield, P/E and fundamental score, and you can sort it by any column. Companies that have not
            filed a recent annual report are marked, and their scores are lowered.
          </>,
          <>
            {s.median_pe != null && data.market.median_pe != null ? (
              <>
                The sector&apos;s median P/E is <b>{s.median_pe.toFixed(1)}</b> against {data.market.median_pe.toFixed(1)} for the
                whole market, so the typical {s.sector.toLowerCase()} share is{" "}
                {s.median_pe < data.market.median_pe * 0.85
                  ? "priced well below"
                  : s.median_pe > data.market.median_pe * 1.15
                    ? "priced well above"
                    : "priced close to"}{" "}
                the market for each taka of profit.{" "}
              </>
            ) : null}
            {s.median_yield_pct != null ? (
              <>
                The median dividend yield is <b>{pct(s.median_yield_pct, 1)}</b>
                {data.market.median_yield_pct != null ? <> (market {pct(data.market.median_yield_pct, 1)})</> : null}.{" "}
              </>
            ) : null}
            {s.median_roe_pct != null ? <>Typical return on equity is {pct(s.median_roe_pct, 1)}. </> : null}
            {s.top_ranked ? (
              <>
                The highest-scoring company in the sector right now is{" "}
                <b>{s.top_ranked.company_name ?? s.top_ranked.trading_code}</b> ({s.top_ranked.trading_code}).
              </>
            ) : null}
          </>,
          <>
            Sector medians matter because they set the bar: a bank trading at a P/E of 6 is ordinary if every
            bank does, and cheap only if its peers trade at 9. Compare a company with its sector first, then with
            the market, and read the &ldquo;how this sector is scored&rdquo; note above for the rules that applied.
          </>,
        ]}
        introBn={[
          <>
            ঢাকা স্টক এক্সচেঞ্জের <b>{nameBn} সেক্টরে</b> স্কোর পাওয়া কোম্পানি {s.company_count}টি
            {s.total_mcap_mn != null ? <>, যাদের মোট বাজার মূলধন {croreBn(s.total_mcap_mn)}</> : null}
            {data.market.company_count ? <>। পুরো এক্সচেঞ্জে স্কোর পাওয়া কোম্পানি {data.market.company_count}টি</> : null}।
            ওপরের টেবিলে প্রতিটির অফিশিয়াল সমাপনী দাম, দিনের ওঠানামা, ইপিএস, ডিভিডেন্ড ইল্ড, পিই আর স্কোর আছে,
            আর যেকোনো কলাম দিয়ে সাজানো যায়। যেসব কোম্পানি সম্প্রতি বার্ষিক হিসাব জমা দেয়নি, সেগুলো চিহ্নিত করা আছে
            এবং তাদের স্কোর কমানো হয়েছে।
          </>,
          <>
            {s.median_pe != null && data.market.median_pe != null ? (
              <>
                এই সেক্টরের মধ্যম পিই <b>{s.median_pe.toFixed(1)}</b>, আর পুরো বাজারের {data.market.median_pe.toFixed(1)}।
                তাই প্রতি টাকা মুনাফার হিসাবে এই সেক্টরের সাধারণ শেয়ারের দাম বাজারের{" "}
                {peWord === "below" ? "চেয়ে বেশ কম" : peWord === "above" ? "চেয়ে বেশ বেশি" : "কাছাকাছি"}।{" "}
              </>
            ) : null}
            {s.median_yield_pct != null ? (
              <>
                মধ্যম ডিভিডেন্ড ইল্ড <b>{pct(s.median_yield_pct, 1)}</b>
                {data.market.median_yield_pct != null ? <> (বাজারে {pct(data.market.median_yield_pct, 1)})</> : null}।{" "}
              </>
            ) : null}
            {s.median_roe_pct != null ? <>মূলধনে মুনাফার সাধারণ হার {pct(s.median_roe_pct, 1)}। </> : null}
            {s.top_ranked ? (
              <>
                এখন এই সেক্টরে সবচেয়ে বেশি স্কোর{" "}
                <b>{s.top_ranked.company_name ?? s.top_ranked.trading_code}</b> ({s.top_ranked.trading_code})-এর।
              </>
            ) : null}
          </>,
          <>
            সেক্টরের মধ্যম মান একটি মানদণ্ড ঠিক করে দেয়। সব ব্যাংকের পিই 6 হলে কোনো ব্যাংকের পিই 6 হওয়া স্বাভাবিক;
            অন্যদের পিই 9 হলে তবেই সেটি সস্তা। তাই আগে কোম্পানিকে তার সেক্টরের সঙ্গে, তারপর পুরো বাজারের সঙ্গে
            তুলনা করুন। কোন নিয়মে স্কোর হয়েছে, তা ওপরের &ldquo;স্কোর যেভাবে হয়&rdquo; অংশে পাবেন।
          </>,
        ]}
        faq={[
          {
            q: `How many ${s.sector.toLowerCase()} companies are listed on the Dhaka Stock Exchange?`,
            a: `TopStockBD scores ${s.company_count} ${s.sector.toLowerCase()} ${s.company_count === 1 ? "company" : "companies"} on DSE: every one that publishes annual accounts. Mutual funds and bonds are left out of every sector.`,
            qBn: `ঢাকা স্টক এক্সচেঞ্জে ${nameBn} সেক্টরের কয়টি কোম্পানি তালিকাভুক্ত?`,
            aBn: `ডিএসইতে ${nameBn} সেক্টরের ${s.company_count}টি কোম্পানির স্কোর দেয় TopStockBD, অর্থাৎ যারা বার্ষিক হিসাব প্রকাশ করে তাদের সবার। মিউচুয়াল ফান্ড আর বন্ড কোনো সেক্টরেই ধরা হয় না।`,
          },
          {
            q: `Which ${s.sector.toLowerCase()} stock has the highest fundamental score?`,
            a: s.top_ranked
              ? `${s.top_ranked.company_name ?? s.top_ranked.trading_code} (${s.top_ranked.trading_code}) leads the sector on TopStockBD's five-pillar score right now. Scores are recomputed after every trading day, so check the table for the current order.`
              : "The table above is sorted by score by default; the top row is the current leader. Scores are recomputed after every trading day.",
            qBn: `${nameBn} সেক্টরের কোন শেয়ারের স্কোর সবচেয়ে বেশি?`,
            aBn: s.top_ranked
              ? `এখন TopStockBD-এর পাঁচ অংশের স্কোরে সেক্টরে এগিয়ে আছে ${s.top_ranked.company_name ?? s.top_ranked.trading_code} (${s.top_ranked.trading_code})। প্রতিটি লেনদেনের দিনের পর স্কোর আবার হিসাব হয়, তাই এখনকার ক্রম টেবিলে দেখুন।`
              : "ওপরের টেবিল শুরুতে স্কোর অনুযায়ী সাজানো থাকে; প্রথম সারিতেই এখনকার শীর্ষ কোম্পানি। প্রতিটি লেনদেনের দিনের পর স্কোর আবার হিসাব হয়।",
          },
          {
            q: `Is the ${s.sector.toLowerCase()} sector cheap or expensive right now?`,
            a:
              s.median_pe != null && data.market.median_pe != null
                ? `Its median P/E is ${s.median_pe.toFixed(1)} against ${data.market.median_pe.toFixed(1)} for the market, so it is ${peWord === "below" ? "cheaper than the typical DSE share" : peWord === "above" ? "more expensive than the typical DSE share" : "about in line with the market"}. A low P/E can mean good value or trouble, so read it with the score.`
                : "Compare the sector's median P/E and dividend yield with the market figures shown above: below-market P/E with an above-market yield usually reads as cheap, the reverse as expensive.",
            qBn: `${nameBn} সেক্টরের দাম এখন কম না বেশি?`,
            aBn:
              s.median_pe != null && data.market.median_pe != null
                ? `এর মধ্যম পিই ${s.median_pe.toFixed(1)}, আর বাজারের ${data.market.median_pe.toFixed(1)}। তাই এটি ${peWord === "below" ? "ডিএসইর সাধারণ শেয়ারের চেয়ে সস্তা" : peWord === "above" ? "ডিএসইর সাধারণ শেয়ারের চেয়ে দামি" : "মোটামুটি বাজারের সমান"}। কম পিই মানে ভালো দাম হতে পারে, আবার সমস্যাও হতে পারে, তাই এটি স্কোরের সঙ্গে মিলিয়ে পড়ুন।`
                : "সেক্টরের মধ্যম পিই আর ডিভিডেন্ড ইল্ড ওপরের বাজারের সংখ্যার সঙ্গে মিলিয়ে দেখুন। বাজারের চেয়ে কম পিই আর বেশি ইল্ড সাধারণত সস্তার লক্ষণ, উল্টোটা দামির।",
          },
          {
            q: `How are ${s.sector.toLowerCase()} companies scored?`,
            a: data.scoring_note.en,
            qBn: `${nameBn} সেক্টরের কোম্পানির স্কোর কীভাবে হয়?`,
            aBn: data.scoring_note.bn,
          },
        ]}
      />

      {data.related_sectors.length > 0 && (
        <section className="mb-8">
          <SectionHeader title={<T en="Other sectors" bn="অন্য সেক্টর" />} className="mt-8" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.related_sectors.map((o) => (
              <SectorCard key={o.slug} sector={o} />
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-text-muted">
            <Link href="/sectors" className="text-primary underline">
              <T en={`See all ${data.market.sector_count} sectors`} bn={`সব ${data.market.sector_count}টি সেক্টর দেখুন`} />
            </Link>{" "}
            ·{" "}
            <T
              en={`market middle P/E ${data.market.median_pe != null ? data.market.median_pe.toFixed(1) : "—"}, yield ${data.market.median_yield_pct != null ? pct(data.market.median_yield_pct, 1) : "—"}`}
              bn={`বাজারের মধ্যম পিই ${data.market.median_pe != null ? data.market.median_pe.toFixed(1) : "—"}, ইল্ড ${data.market.median_yield_pct != null ? pct(data.market.median_yield_pct, 1) : "—"}`}
            />
          </p>
        </section>
      )}
    </>
  );
}
