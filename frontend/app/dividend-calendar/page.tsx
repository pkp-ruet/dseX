import type { Metadata } from "next";
import { getDividendCalendar } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import CalendarSummary from "@/components/dividend-calendar/CalendarSummary";
import RecordDateBoard from "@/components/dividend-calendar/RecordDateBoard";
import AgmBoard from "@/components/dividend-calendar/AgmBoard";
import TopCashDividends from "@/components/dividend-calendar/TopCashDividends";
import RecentDeclarations from "@/components/dividend-calendar/RecentDeclarations";
import HowDividendsWork from "@/components/dividend-calendar/HowDividendsWork";
import ErrorState from "@/components/ui/ErrorState";
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
          eyebrow="Dhaka Stock Exchange"
          title="Dividend Calendar"
          bn="কোন কোম্পানি কবে ডিভিডেন্ড দিচ্ছে — রেকর্ড ডেট, এজিএম আর শেষ কেনার দিন।"
        />
        <ErrorState
          size="inline"
          title="Couldn't load the dividend calendar"
          bn="ডিভিডেন্ড ক্যালেন্ডার এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          reload
          links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
        />
      </>
    );
  }

  const lead = data.settlement.normal_buy_lead_trading_days;

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
              text:
                `Only if the shares are in your BO account on the record date. Normal-market trades on DSE settle on T+2, so buying about ${lead} trading days before the record date is the safe side. In the final days DSE moves the stock to the spot market, where settlement is faster — confirm the exact cut-off with your broker.`,
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
        eyebrow="Dhaka Stock Exchange"
        title="Dividend Calendar"
        bn="কোন কোম্পানি কবে ডিভিডেন্ড দিচ্ছে — রেকর্ড ডেট, এজিএম আর শেষ কেনার দিন।"
        actions={
          <span className="ms-page-date">
            {data.stats.declarations_tracked} declarations tracked · updated{" "}
            {formatDate(data.today)}
          </span>
        }
      />

      <CalendarSummary data={data} />

      <RecordDateBoard events={data.record_dates} />

      <AgmBoard events={data.agms} />

      <TopCashDividends events={data.top_cash_dividends} />

      <RecentDeclarations events={data.recent_declarations} />

      <HowDividendsWork data={data} />

      {/* The FAQ for this page lives in HowDividendsWork + the FAQPage JSON-LD above,
          so this block is prose only (faqSchema off, no faq). */}
      <PageGuide
        title="About this dividend calendar"
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
            A high yield alone is not a reason to buy: the share often drops by roughly the dividend on the
            ex-date, and a company paying out more than it earns will not keep it up. Open the company for its
            dividend history and fundamental score, or start from the{" "}
            <Link href="/stock-insights/top-dividend-stocks-bangladesh">best dividend shares list</Link>.
          </>,
        ]}
        bn="রেকর্ড ডেটের আগে শেষ কোন দিনে কিনলে ডিভিডেন্ড পাবেন — সেটাই এখানে শেষ কেনার দিন।"
      />
    </>
  );
}
