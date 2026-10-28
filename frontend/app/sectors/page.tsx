import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectorCard from "@/components/sector/SectorCard";
import { getSectors } from "@/lib/api";
import { crore, pct } from "@/lib/formatters";
import { croreBn, sectorBn } from "@/lib/bn";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import PageGuide from "@/components/seo/PageGuide";
import SectionHeader from "@/components/ui/SectionHeader";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

const TITLE = "DSE Sectors — Sector-wise Share List, P/E & Dividend Yield";
const DESCRIPTION =
  "Every Dhaka Stock Exchange sector side by side: how many companies, combined market value, median score, median P/E, dividend yield and today's move — with a full page for each sector.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE sectors",
    "DSE sector wise stock list",
    "DSE sector wise share price",
    "DSE sector PE ratio",
    "which sector is best in Bangladesh share market",
    "bank sector DSE",
    "textile sector Bangladesh",
    "pharmaceuticals sector DSE",
    "DSE sector P/E",
    "best sector Bangladesh stock market",
    "Dhaka Stock Exchange sector performance",
  ],
  alternates: { canonical: "/sectors" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/sectors`,
    type: "website",
  },
};

function MarketStat({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-2 p-2.5 sm:p-3">
      <span className="text-xs font-semibold text-text-muted">
        {label}
      </span>
      <span className="text-base font-extrabold leading-none tabular-nums text-text-main sm:text-lg">
        {value}
      </span>
    </div>
  );
}

export default async function SectorsPage() {
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const data = await getSectors();
  if (data.sectors.length === 0) throw new Error("No sectors in /api/sectors");

  const { market, sectors } = data;
  const largest = sectors[0] ?? null;
  const highestYield =
    [...sectors].filter((s) => s.median_yield_pct != null).sort((a, b) => (b.median_yield_pct ?? 0) - (a.median_yield_pct ?? 0))[0] ?? null;
  const strongest =
    [...sectors].filter((s) => s.median_score != null).sort((a, b) => (b.median_score ?? 0) - (a.median_score ?? 0))[0] ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/sectors`,
        url: `${BASE_URL}/sectors`,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Sectors", item: `${BASE_URL}/sectors` },
        ],
      },
      {
        "@type": "ItemList",
        name: "DSE sectors",
        numberOfItems: sectors.length,
        itemListElement: sectors.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.sector,
          url: `${BASE_URL}/sector/${s.slug}`,
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
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="Sectors" bn="সেক্টর" />}
        actions={
          <span className="ms-page-date">
            <T
              en={`${sectors.length} sectors · ${market.company_count} scored companies`}
              bn={`${sectors.length}টি সেক্টর · স্কোর পাওয়া ${market.company_count}টি কোম্পানি`}
            />
          </span>
        }
      />

      <section className="soft-card mb-6 p-4 sm:p-5">
        <p className="text-sm font-semibold text-text-main">
          <T
            en="Compare whole industries before you pick a company. Every figure below is the middle value of the companies in that sector, so one very large company cannot pull the number up or down."
            bn="কোম্পানি বাছার আগে পুরো সেক্টরের তুলনা করে নিন। নিচের প্রতিটি সংখ্যা সেই সেক্টরের কোম্পানিগুলোর মধ্যম মান, তাই একটি খুব বড় কোম্পানি সংখ্যাটিকে টেনে বাড়াতে বা কমাতে পারে না।"
          />
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <MarketStat label={<T en="Market P/E" bn="বাজারের পিই" />} value={market.median_pe != null ? market.median_pe.toFixed(1) : "—"} />
          <MarketStat
            label={<T en="Market yield" bn="বাজারের ইল্ড" />}
            value={market.median_yield_pct != null ? pct(market.median_yield_pct, 1) : "—"}
          />
          <MarketStat
            label={<T en="Middle score" bn="মধ্যম স্কোর" />}
            value={market.median_score != null ? market.median_score.toFixed(1) : "—"}
          />
          <MarketStat
            label={<T en="Market today" bn="আজকের বাজার" />}
            value={
              market.avg_change_pct != null
                ? `${market.avg_change_pct > 0 ? "+" : ""}${pct(market.avg_change_pct, 2)}`
                : "—"
            }
          />
        </div>
      </section>

      <SectionHeader title={<T en="Every sector, largest first" bn="সব সেক্টর, বড়টি আগে" />} className="mt-8" />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sectors.map((s) => (
          <SectorCard key={s.slug} sector={s} />
        ))}
      </div>

      <p className="mb-8 text-xs font-semibold text-text-muted">
        <T
          en="Sectors with fewer than three scored companies are left out, because the middle value of one or two companies says very little. Mutual funds are not scored, so they have no sector page. Looking for one company instead? "
          bn="তিনটির কম স্কোর পাওয়া কোম্পানির সেক্টর এখানে রাখা হয়নি, কারণ এক বা দুটি কোম্পানির মধ্যম মান তেমন কিছু বলে না। মিউচুয়াল ফান্ডের স্কোর হয় না, তাই সেগুলোর সেক্টর পেজ নেই। একটি কোম্পানি খুঁজছেন? "
        />
        <Link href="/stocks" className="text-primary underline">
          <T en="Browse all shares A to Z" bn="A থেকে Z সব শেয়ার দেখুন" />
        </Link>
        .
      </p>

      <PageGuide
        title="About DSE sectors"
        titleBn="ডিএসইর সেক্টর সম্পর্কে"
        intro={[
          <>
            The Dhaka Stock Exchange groups its listed companies into sectors: banks, insurance, textiles,
            pharmaceuticals, fuel and power, engineering, food, cement, telecom and more. This page puts all{" "}
            {sectors.length} scored sectors side by side, largest first by market value, so you can see{" "}
            <b>which part of the market is big, which is cheap, and which is moving</b> before you look at any
            single company.
          </>,
          <>
            Every figure is a <b>median</b>, not an average: the middle company&apos;s P/E, dividend yield, return on
            equity and score. One giant like Grameenphone, or one company making a loss, cannot pull a median
            around, so it describes the typical company in the sector.{" "}
            {largest ? (
              <>
                Right now the largest sector by value is <b>{largest.sector}</b>
                {largest.total_mcap_mn != null ? <> at {crore(largest.total_mcap_mn)}</> : null}
              </>
            ) : null}
            {highestYield && highestYield.median_yield_pct != null ? (
              <>
                , and the highest typical dividend yield is in <b>{highestYield.sector}</b> at{" "}
                {pct(highestYield.median_yield_pct, 1)}
              </>
            ) : null}
            {strongest && strongest.median_score != null ? (
              <>
                ; the strongest median score belongs to <b>{strongest.sector}</b> ({strongest.median_score.toFixed(1)}/100)
              </>
            ) : null}
            .
          </>,
          <>
            Banks, non-bank financial institutions and insurers are scored with their own rules, because a
            lender&apos;s debt is its raw material and an insurer has no gross profit line; the sector page explains
            which rules applied. Open any sector for its full company table, today&apos;s gainers and losers, the
            best dividend payers and how it compares with the whole market.
          </>,
        ]}
        introBn={[
          <>
            ঢাকা স্টক এক্সচেঞ্জ তালিকাভুক্ত কোম্পানিগুলোকে কয়েকটি সেক্টরে ভাগ করে: ব্যাংক, বিমা, বস্ত্র, ওষুধ,
            জ্বালানি ও বিদ্যুৎ, প্রকৌশল, খাদ্য, সিমেন্ট, টেলিযোগাযোগ ইত্যাদি। এই পেজে স্কোর পাওয়া {sectors.length}টি
            সেক্টর পাশাপাশি রাখা আছে, বাজার মূলধনে বড়টি আগে। তাই কোনো একটি কোম্পানি দেখার আগেই বোঝা যায়{" "}
            <b>বাজারের কোন অংশ বড়, কোনটির দাম কম, আর কোনটি নড়ছে</b>।
          </>,
          <>
            প্রতিটি সংখ্যা <b>মধ্যম মান</b>, গড় নয়: মাঝের কোম্পানির পিই, ডিভিডেন্ড ইল্ড, মূলধনে মুনাফার হার আর
            স্কোর। গ্রামীণফোনের মতো একটি বড় কোম্পানি বা একটি লোকসানি কোম্পানি মধ্যম মানকে টেনে সরাতে পারে না,
            তাই এটি সেক্টরের সাধারণ কোম্পানির ছবি দেখায়।{" "}
            {largest ? (
              <>
                এখন বাজার মূলধনে সবচেয়ে বড় সেক্টর <b>{sectorBn(largest.sector)}</b>
                {largest.total_mcap_mn != null ? <>, মোট {croreBn(largest.total_mcap_mn)}</> : null}।{" "}
              </>
            ) : null}
            {highestYield && highestYield.median_yield_pct != null ? (
              <>
                সাধারণ ডিভিডেন্ড ইল্ড সবচেয়ে বেশি <b>{sectorBn(highestYield.sector)}</b> সেক্টরে,{" "}
                {pct(highestYield.median_yield_pct, 1)}।{" "}
              </>
            ) : null}
            {strongest && strongest.median_score != null ? (
              <>
                সবচেয়ে ভালো মধ্যম স্কোর <b>{sectorBn(strongest.sector)}</b> সেক্টরের ({strongest.median_score.toFixed(1)}/100)।
              </>
            ) : null}
          </>,
          <>
            ব্যাংক, আর্থিক প্রতিষ্ঠান আর বিমা কোম্পানির স্কোর আলাদা নিয়মে হয়, কারণ ঋণ দেওয়াই ব্যাংকের ব্যবসা, আর
            বিমা কোম্পানির হিসাবে গ্রস মুনাফার লাইন থাকে না। কোন নিয়ম খাটানো হয়েছে, তা সেক্টরের পেজে লেখা আছে।
            যেকোনো সেক্টর খুললে পাবেন তার সব কোম্পানির টেবিল, আজ কোনগুলো বেড়েছে বা কমেছে, কারা সবচেয়ে বেশি ডিভিডেন্ড
            দেয়, আর পুরো বাজারের সঙ্গে তুলনা।
          </>,
        ]}
        faq={[
          {
            q: "How many sectors are there on the Dhaka Stock Exchange?",
            a: `DSE classifies listed securities into about 22 sectors, including mutual funds and corporate bonds. TopStockBD scores ${sectors.length} of them: every sector with at least three operating companies that publish annual accounts.`,
            qBn: "ঢাকা স্টক এক্সচেঞ্জে কয়টি সেক্টর আছে?",
            aBn: `মিউচুয়াল ফান্ড আর কর্পোরেট বন্ডসহ ডিএসই তালিকাভুক্ত সিকিউরিটিগুলোকে প্রায় 22টি সেক্টরে ভাগ করে। এর মধ্যে TopStockBD ${sectors.length}টি সেক্টরের স্কোর দেয়, যেখানে অন্তত তিনটি চালু কোম্পানি বার্ষিক হিসাব প্রকাশ করে।`,
          },
          {
            q: "Which DSE sector is the largest?",
            a: largest
              ? `By combined market value it is ${largest.sector}${largest.total_mcap_mn != null ? ` at about ${crore(largest.total_mcap_mn)}` : ""}, with ${largest.company_count} scored companies. Rankings shift with prices, so the cards above are the live order.`
              : "Sector sizes change with prices; the cards above list every scored sector, largest first by combined market value.",
            qBn: "ডিএসইর সবচেয়ে বড় সেক্টর কোনটি?",
            aBn: largest
              ? `মোট বাজার মূলধনে এটি ${sectorBn(largest.sector)}${largest.total_mcap_mn != null ? `, প্রায় ${croreBn(largest.total_mcap_mn)}` : ""}, যেখানে স্কোর পাওয়া কোম্পানি ${largest.company_count}টি। দামের সঙ্গে এই ক্রম বদলায়, তাই ওপরের কার্ডগুলোই এখনকার ক্রম দেখায়।`
              : "দামের সঙ্গে সেক্টরের আকার বদলায়। ওপরের কার্ডগুলোতে স্কোর পাওয়া সব সেক্টর আছে, মোট বাজার মূলধনে বড়টি আগে।",
          },
          {
            q: "What does the sector P/E tell me?",
            a: `The median price-to-earnings ratio of the sector's companies: how many taka investors pay for one taka of annual profit. Compare it with the market P/E${market.median_pe != null ? ` (${market.median_pe.toFixed(1)} today)` : ""}. A sector far below it is either expected to have trouble or overlooked; a sector far above it is priced for growth.`,
            qBn: "সেক্টরের পিই কী বলে?",
            aBn: `এটি সেক্টরের কোম্পানিগুলোর মধ্যম পিই: বছরে এক টাকা মুনাফার জন্য বিনিয়োগকারীরা কত টাকা দিচ্ছেন। এটিকে বাজারের পিইর${market.median_pe != null ? ` (আজ ${market.median_pe.toFixed(1)})` : ""} সঙ্গে মিলিয়ে দেখুন। অনেক কম হলে হয় সেক্টরটি নিয়ে দুশ্চিন্তা আছে, নয়তো সেটি চোখ এড়িয়ে গেছে; অনেক বেশি হলে দামে বাড়তির আশা ধরা আছে।`,
          },
          {
            q: "Why are banks and insurance companies scored differently?",
            a: "A bank borrows to lend, so debt-to-equity and interest cover mean nothing for it; TopStockBD scores banks and NBFIs on their capital cushion and net interest margin instead. Insurers have no gross profit line, so net margin stands in. Each sector page states which rule set was used.",
            qBn: "ব্যাংক আর বিমা কোম্পানির স্কোর আলাদাভাবে হয় কেন?",
            aBn: "ব্যাংক ঋণ নিয়ে ঋণ দেয়, তাই ঋণ-মূলধন অনুপাত বা সুদ পরিশোধের ক্ষমতা তার ক্ষেত্রে কিছু বোঝায় না। তাই TopStockBD ব্যাংক আর আর্থিক প্রতিষ্ঠানকে নিজের মূলধনের জোর আর সুদের মার্জিন দিয়ে মাপে। বিমা কোম্পানির হিসাবে গ্রস মুনাফা থাকে না, তাই নেট মার্জিন ধরা হয়। কোন নিয়ম খাটানো হয়েছে, প্রতিটি সেক্টর পেজে তা লেখা আছে।",
          },
        ]}
      />
    </>
  );
}
