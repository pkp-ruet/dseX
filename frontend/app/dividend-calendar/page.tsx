import type { Metadata } from "next";
import { getDividendCalendar } from "@/lib/api";
import { recountCalendar } from "@/lib/dividend-dates";
import { formatDate } from "@/lib/formatters";
import CalendarSummary from "@/components/dividend-calendar/CalendarSummary";
import ComingNext from "@/components/dividend-calendar/ComingNext";
import IncomeCard from "@/components/dividend-calendar/IncomeCard";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import { perShareTk } from "@/components/dividend-calendar/DividendRow";
import type { DividendCalendarData } from "@/lib/api";
import RecordDateBoard from "@/components/dividend-calendar/RecordDateBoard";
import AgmBoard from "@/components/dividend-calendar/AgmBoard";
import TopCashDividends from "@/components/dividend-calendar/TopCashDividends";
import RecentDeclarations, { RECENT_LIMIT } from "@/components/dividend-calendar/RecentDeclarations";
import CalendarTabs, { type CalendarPanel } from "@/components/dividend-calendar/CalendarTabs";
import HowDividendsWork, { buyTodayAnswer } from "@/components/dividend-calendar/HowDividendsWork";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import PageGuide from "@/components/seo/PageGuide";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

// Hourly, though the data changes once a day: the render recounts every
// "days left" from the dates (`recountCalendar`), so it has to happen soon after
// Dhaka midnight. The fetch keeps its daily cache, so this costs no backend call.
export const revalidate = 3600;

// The year is in the title because that is how the query is typed ("dse record date 2026").
const YEAR = new Date().getFullYear();
const TITLE = `DSE Dividend, Record Date & AGM Calendar ${YEAR}`;
const DESCRIPTION =
  "Every upcoming DSE record date and AGM in one calendar: cash and bonus dividend percentages, taka per share, gross yield at today's price, and the last day you can buy and still qualify.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE dividend calendar",
    "DSE record date",
    `DSE record date ${YEAR}`,
    `DSE dividend ${YEAR}`,
    "DSE AGM record date list",
    "upcoming dividend DSE",
    "dividend record date Bangladesh",
    "DSE AGM date",
    "dividend declaration DSE",
    "Dhaka Stock Exchange dividend",
    "cash dividend Bangladesh",
    "bonus share DSE",
    "best dividend stocks Bangladesh",
    "লভ্যাংশ রেকর্ড ডেট",
  ],
  alternates: { canonical: "/dividend-calendar" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/dividend-calendar`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Dividend Calendar",
    description:
      "Upcoming DSE record dates and AGMs, with cash per share, yield, and the last day to buy and still qualify.",
  },
};

export default async function DividendCalendarPage() {
  // A failed fetch throws (no catch): ISR then keeps serving the last good
  // page, where a rendered error state was cached as the page for a day.
  const data = recountCalendar(await getDividendCalendar());

  const lead = data.settlement.normal_buy_lead_trading_days;
  const forecast = data.forecast ?? [];

  // The four lists as tabs (2026-10-29 compact redesign) — they were four
  // sections one under another, and everything under the record dates sat
  // past a very long scroll. Ids keep the old section anchors working.
  const panels: CalendarPanel[] = [
    {
      key: "record-dates",
      label: { en: "Record dates", bn: "রেকর্ড ডেট" },
      count: data.record_dates.length,
      body: <RecordDateBoard events={data.record_dates} />,
    },
    {
      key: "agms",
      label: { en: "AGMs", bn: "এজিএম" },
      count: data.agms.length,
      body: <AgmBoard events={data.agms} />,
    },
    {
      key: "top-payers",
      label: { en: "Biggest payers", bn: "সবচেয়ে বড় ডিভিডেন্ড" },
      short: { en: "Top payers", bn: "বড় ডিভিডেন্ড" },
      count: data.top_cash_dividends.length,
      body: <TopCashDividends events={data.top_cash_dividends} />,
    },
    {
      key: "recent",
      label: { en: "Just declared", bn: "সদ্য ঘোষিত" },
      short: { en: "Declared", bn: "নতুন ঘোষণা" },
      count: Math.min(data.recent_declarations.length, RECENT_LIMIT),
      body: <RecentDeclarations events={data.recent_declarations} />,
    },
    {
      // Who hasn't declared for this year yet (2026-10-31): last year's facts
      // free, when and how much we expect Premium.
      key: "coming-next",
      label: { en: "Coming next", bn: "সামনে আসছে" },
      short: { en: "Next", bn: "আসছে" },
      count: forecast.length,
      body: <ComingNext rows={forecast} />,
    },
  ].filter((p) => p.key === "record-dates" || p.count > 0);

  // FAQ copy mirrors components/dividend-calendar/HowDividendsWork.tsx.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dividend-calendar`,
        url: `${BASE_URL}/dividend-calendar`,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
        dateModified: data.today,
        // Paywall markup: every row is free since 2026-10-29; "Is it safe?" and
        // "Worth buying for it?" under each cash dividend, the "Coming next"
        // estimates and the income taka are Premium (under .premium-locked).
        isAccessibleForFree: false,
        hasPart: {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: ".premium-locked",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Dividend Calendar",
            item: `${BASE_URL}/dividend-calendar`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "If I buy a DSE share today, will I get the dividend?",
            acceptedAnswer: {
              "@type": "Answer",
              text: buyTodayAnswer(lead),
            },
          },
          {
            "@type": "Question",
            name: "What is a record date on the Dhaka Stock Exchange?",
            acceptedAnswer: {
              "@type": "Answer",
              text:
                "The record date is the day the company checks its register of shareholders. Whoever holds the share that day receives the declared dividend; someone who buys afterwards does not, because the entitlement stays with the seller.",
            },
          },
          {
            "@type": "Question",
            name: "How much money is a 25% cash dividend?",
            acceptedAnswer: {
              "@type": "Answer",
              text:
                "Dividend percentages are quoted on face value, not market price. A 25% cash dividend on a ৳10 face value pays ৳2.50 per share, whatever the share trades at. A 25% bonus dividend instead gives 25 extra shares per 100 held and pays no cash.",
            },
          },
          {
            "@type": "Question",
            name: "How much tax is deducted from a DSE dividend?",
            acceptedAnswer: {
              "@type": "Answer",
              text:
                "Cash dividends are taxed at 10% for shareholders with a TIN and 15% without one, deducted at source before the money reaches your bank account. Bonus shares are not cash and are not taxed this way.",
            },
          },
          {
            "@type": "Question",
            name: "When is a DSE dividend actually paid?",
            acceptedAnswer: {
              "@type": "Answer",
              text:
                "A final dividend is paid after shareholders approve it at the AGM, usually within 30 days. An interim dividend needs no AGM approval and is paid directly after its record date.",
            },
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

      <PageHeader
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="Dividend calendar" bn="ডিভিডেন্ড ক্যালেন্ডার" />}
        lead={
          <T
            en="Which company pays a dividend and when: record dates, AGMs and the last day to buy."
            bn="কোন কোম্পানি কবে ডিভিডেন্ড দিচ্ছে: রেকর্ড ডেট, এজিএম আর কেনার শেষ দিন।"
          />
        }
        actions={
          <span className="ms-page-date">
            <T
              en={`Updated ${formatDate(data.today)} · ${data.stats.declarations_tracked} declarations tracked`}
              bn={`হালনাগাদ ${bnDate(data.today)} · ${data.stats.declarations_tracked}টি ঘোষণা দেখা হচ্ছে`}
            />
          </span>
        }
      />

      <CalendarSummary data={data} />

      {/* The reader's own cash by month (signed in, with shares). */}
      <IncomeCard records={data.record_dates} forecast={forecast} today={data.today} />

      {/* Every list in full, for every reader. What Premium adds sits in place
          (DividendRow, ComingNext, IncomeCard — screen-only) and is named once
          by the page's question card under the lists (2026-10-31). */}
      <CalendarTabs panels={panels} />
      <PageQuestions
        id={CALENDAR_PREMIUM_ANCHOR}
        area="dividend-calendar"
        className="dc-questions"
        title={{ en: "Every date is free. Here is what it leaves open.", bn: "প্রতিটি তারিখ ফ্রি। তবু কিছু প্রশ্ন থেকে যায়।" }}
        lead={{
          en: "Premium answers these in place on the calendar, and reminds you on the last day to buy any share you pick.",
          bn: "প্রিমিয়ামে এর উত্তর ক্যালেন্ডারেই, আর আপনার বেছে নেওয়া যেকোনো শেয়ার কেনার শেষ দিনে মনে করিয়ে দেওয়া হয়।",
        }}
        rows={calendarQuestions(data)}
        label={{ en: "Is each dividend safe, and what comes next", bn: "প্রতিটি ডিভিডেন্ড কতটা নিরাপদ, আর সামনে কী আসছে" }}
      />

      <HowDividendsWork data={data} />

      {/* The FAQ for this page lives in HowDividendsWork + the FAQPage JSON-LD above,
          so this block is prose only (faqSchema off, no faq). */}
      <PageGuide
        title="About this dividend calendar"
        titleBn="এই ডিভিডেন্ড ক্যালেন্ডার সম্পর্কে"
        faqSchema={false}
        intro={[
          <>
            This is a <b>calendar of every dividend event on the Dhaka Stock Exchange</b> that we can see
            coming: upcoming record dates, AGM dates, the cash and bonus percentages each board declared, and
            the biggest cash payouts of the past year. It is rebuilt from DSE&apos;s own corporate announcements
            every trading day, currently tracking {data.stats.declarations_tracked} declarations.
          </>,
          <>
            Two numbers on each row do the work. <b>Cash per share</b> turns DSE&apos;s percentage (quoted on a
            ৳10 face value) into taka, and <b>gross yield</b> divides that by today&apos;s closing price, so a
            &ldquo;30% dividend&rdquo; on a ৳300 share reads as the 1% it really is. The <b>buy-by</b> day is the last
            normal-market session that still lands the shares in your BO account by the record date, allowing
            for T+2 settlement and DSE&apos;s spot-market window just before it.
          </>,
          <>
            A high yield alone is not a reason to buy. The share price often drops by about the dividend after
            the record date, and a company that pays out more than it earns cannot keep it up. Open the company
            for its dividend history and fundamental score, or start from the{" "}
            <Link href="/stock-insights/top-dividend-stocks-bangladesh">best dividend shares list</Link>.
          </>,
        ]}
        introBn={[
          <>
            এটি <b>ঢাকা স্টক এক্সচেঞ্জের সামনের সব ডিভিডেন্ডের ক্যালেন্ডার</b>, যতটা আমরা আগে থেকে দেখতে পাই:
            আসন্ন রেকর্ড ডেট, এজিএমের তারিখ, প্রতিটি বোর্ডের ঘোষিত নগদ আর বোনাস শতাংশ, আর গত এক বছরের সবচেয়ে
            বড় নগদ ডিভিডেন্ড। প্রতিটি লেনদেনের দিনে ডিএসইতে কোম্পানির নিজের ঘোষণা থেকে এটি নতুন করে তৈরি হয়; এখন{" "}
            {data.stats.declarations_tracked}টি ঘোষণা দেখা হচ্ছে।
          </>,
          <>
            প্রতিটি সারির দুটি সংখ্যা আসল কাজ করে। <b>শেয়ারপ্রতি নগদ</b> ডিএসইর শতাংশকে (৳10 ফেস ভ্যালুর ওপর)
            টাকায় দেখায়, আর <b>ডিভিডেন্ড ইল্ড</b> সেটিকে আজকের সমাপনী দাম দিয়ে ভাগ করে। তাই ৳300 দামের শেয়ারে
            &ldquo;30% ডিভিডেন্ড&rdquo; আসলে 1%। <b>কেনার শেষ দিন</b> হলো সাধারণ বাজারের সেই শেষ দিন, যেদিন কিনলে
            T+2 নিষ্পত্তি আর তার ঠিক আগের স্পট মার্কেটের সময় মিলিয়েও রেকর্ড ডেটের মধ্যে শেয়ার আপনার বিও
            অ্যাকাউন্টে পৌঁছায়।
          </>,
          <>
            শুধু বেশি ইল্ড দেখে কেনা ঠিক নয়। রেকর্ড ডেটের পর শেয়ারের দাম প্রায়ই ডিভিডেন্ডের সমান কমে যায়, আর যে
            কোম্পানি আয়ের চেয়ে বেশি ডিভিডেন্ড দেয়, সে তা ধরে রাখতে পারে না। কোম্পানির ডিভিডেন্ডের ইতিহাস আর স্কোর
            দেখতে তার পেজ খুলুন, অথবা শুরু করুন{" "}
            <Link href="/stock-insights/top-dividend-stocks-bangladesh">সেরা ডিভিডেন্ড শেয়ারের তালিকা</Link> থেকে।
          </>,
        ]}
      />
    </>
  );
}

/** The page's question card rows: real counts and one real company from the
 *  calendar, each with the question Premium answers on the page. */
function calendarQuestions(data: DividendCalendarData): PageQuestion[] {
  const rows: PageQuestion[] = [];
  const soon = data.record_dates.filter(
    (e) => (e.cash_per_share ?? 0) > 0 && e.record_days_left != null && e.record_days_left <= 14,
  );
  if (soon.length > 0) {
    const risky = soon.filter((e) => e.safety?.level === "risk").length;
    rows.push({
      key: "safe",
      fact: { en: `${soon.length} cash record dates in 2 weeks`, bn: `2 সপ্তাহে ${soon.length}টি নগদ ডিভিডেন্ডের রেকর্ড ডেট` },
      ask: { en: "Which of these dividends are safe?", bn: "এর মধ্যে কোন ডিভিডেন্ডগুলো নিরাপদ?" },
      hint: risky
        ? { en: `${risky} look at risk. We say which, and why.`, bn: `${risky}টি ঝুঁকিতে মনে হচ্ছে। কোনগুলো, আর কেন, তা বলি।` }
        : { en: "How much of its profit each one pays out, and whether it can keep paying.", bn: "প্রতিটি মুনাফার কত অংশ দেয়, আর দিয়ে যেতে পারবে কিনা।" },
    });
  }
  const forecast = data.forecast ?? [];
  if (forecast.length > 0) {
    rows.push({
      key: "next",
      fact: { en: `${forecast.length} haven't declared yet`, bn: `${forecast.length}টি এখনো ঘোষণা করেনি` },
      ask: { en: "Who is likely to declare next, and how much?", bn: "কে আগে ঘোষণা করতে পারে, আর কত?" },
      hint: { en: "From last year's date, the board meeting and this year's profit.", bn: "গত বছরের তারিখ, পর্ষদ সভা আর এ বছরের মুনাফা থেকে।" },
    });
  }
  const big = data.record_dates
    .filter((e) => e.capture && (e.cash_per_share ?? 0) > 0)
    .sort((a, b) => (b.cash_per_share ?? 0) - (a.cash_per_share ?? 0))[0];
  if (big?.cash_per_share) {
    const tk = perShareTk(big.cash_per_share);
    rows.push({
      key: "capture",
      fact: { en: `${big.trading_code} pays ${tk} a share`, bn: `${big.trading_code} দেবে শেয়ারপ্রতি ${tk}` },
      ask: { en: "Does the price usually fall by more than that?", bn: "দাম কি সাধারণত এর চেয়ে বেশি কমে যায়?" },
      hint: { en: "What happened to the price after its last record dates, and what you keep after tax.", bn: "আগের রেকর্ড ডেটগুলোর পর দামের কী হয়েছিল, আর কর কাটার পর কত থাকে।" },
    });
  }
  rows.push({
    key: "income",
    fact: { en: "Your shares", bn: "আপনার শেয়ার" },
    ask: { en: "How much cash comes to you each month?", bn: "প্রতি মাসে আপনার কাছে কত টাকা আসবে?" },
    hint: { en: "Declared and expected dividends on your portfolio, after tax.", bn: "আপনার পোর্টফোলিওতে ঘোষিত আর আনুমানিক ডিভিডেন্ড, কর কাটার পর।" },
  });
  return rows;
}
