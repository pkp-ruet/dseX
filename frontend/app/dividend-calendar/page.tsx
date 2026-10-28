import type { Metadata } from "next";
import { getDividendCalendar } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import CalendarSummary from "@/components/dividend-calendar/CalendarSummary";
import RecordDateBoard from "@/components/dividend-calendar/RecordDateBoard";
import AgmBoard from "@/components/dividend-calendar/AgmBoard";
import TopCashDividends from "@/components/dividend-calendar/TopCashDividends";
import RecentDeclarations from "@/components/dividend-calendar/RecentDeclarations";
import HowDividendsWork, { buyTodayAnswer } from "@/components/dividend-calendar/HowDividendsWork";
import { bnDate } from "@/lib/bn";
import DividendPromo from "@/components/premium/DividendPromo";
import { PageLockScope } from "@/components/premium/LockScope";
import { FREE_CALENDAR_ROWS } from "@/lib/free-share";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import PageGuide from "@/components/seo/PageGuide";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

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
  const data = await getDividendCalendar().catch(() => null);

  if (!data) {
    return (
      <>
        <PageHeader
          eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
          title={<T en="Dividend calendar" bn="ডিভিডেন্ড ক্যালেন্ডার" />}
        />
        <ErrorState
          size="inline"
          title={<T en="We couldn't load the dividend calendar" bn="ডিভিডেন্ড ক্যালেন্ডার এখন লোড করা যাচ্ছে না" />}
          reload
          links={[{ href: "/dsestockranking", label: <T en="Stock rankings" bn="শেয়ার র‍্যাঙ্কিং" /> }]}
        />
      </>
    );
  }

  const lead = data.settlement.normal_buy_lead_trading_days;

  // The counts behind the locks, for the one Premium card (free numbers — the
  // rows are what's locked). Same split as the boards use.
  const payingAhead = data.record_dates.filter((e) => !e.is_no_dividend);
  const recordLocked = Math.max(0, data.record_dates.length - FREE_CALENDAR_ROWS.recordDates);
  const weekPaying = payingAhead.filter((e) => e.record_days_left != null && e.record_days_left <= 7).length;
  const declaredLocked = Math.max(0, Math.min(12, data.recent_declarations.length) - FREE_CALENDAR_ROWS.declared);
  const promoStakes = [
    recordLocked > 0
      ? { en: `${recordLocked} more record dates in the next 120 days`, bn: `আগামী 120 দিনে আরও ${recordLocked}টি রেকর্ড ডেট` }
      : null,
    weekPaying > 0
      ? {
          en: `${weekPaying} ${weekPaying === 1 ? "company pays" : "companies pay"} a dividend with a record date this week`,
          bn: `এই সপ্তাহে রেকর্ড ডেট, ডিভিডেন্ড দিচ্ছে ${weekPaying}টি কোম্পানি`,
        }
      : null,
    declaredLocked > 0
      ? { en: `${declaredLocked} more new declarations`, bn: `আরও ${declaredLocked}টি নতুন ঘোষণা` }
      : null,
  ];

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
        // Paywall markup: each list past its first row or two is Premium (PremiumGate,
        // pointing at the one Premium card #dc-premium).
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

      {/* Free readers: the page's ONE Premium card (what the full calendar does,
          with the counts behind the locks). Every list below shows a glimpse and
          blurs the rest with one quiet line pointing back here. */}
      <DividendPromo id="dc-premium" stakes={promoStakes} className="mt-4" />

      <PageLockScope anchor="dc-premium">
        <RecordDateBoard events={data.record_dates} />

        <AgmBoard events={data.agms} />

        <TopCashDividends events={data.top_cash_dividends} />

        <RecentDeclarations events={data.recent_declarations} />
      </PageLockScope>

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
