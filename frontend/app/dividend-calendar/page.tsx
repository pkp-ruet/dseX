import type { Metadata } from "next";
import { getDividendCalendar } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import CalendarSummary from "@/components/dividend-calendar/CalendarSummary";
import RecordDateBoard from "@/components/dividend-calendar/RecordDateBoard";
import AgmBoard from "@/components/dividend-calendar/AgmBoard";
import TopCashDividends from "@/components/dividend-calendar/TopCashDividends";
import RecentDeclarations from "@/components/dividend-calendar/RecentDeclarations";
import HowDividendsWork from "@/components/dividend-calendar/HowDividendsWork";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

const TITLE = "DSE Dividend Calendar — Record Dates, AGMs & Declarations";
const DESCRIPTION =
  "Every upcoming DSE record date and AGM in one calendar: cash and bonus dividend percentages, taka per share, gross yield at today's price, and the last day you can buy and still qualify.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE dividend calendar",
    "DSE record date",
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
        <header className="ms-pagehead">
          <h1 className="ms-page-h1">
            <span className="ms-page-kicker">Dhaka Stock Exchange</span>
            <span className="ms-page-h1-main">Dividend Calendar</span>
          </h1>
        </header>
        <div className="ms-card">
          <p className="ms-empty">
            We couldn&apos;t reach the dividend data right now. Please refresh in a moment.
          </p>
        </div>
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
                "Dividend percentages are quoted on face value, not market price. A 25% cash dividend on a Tk 10 face value pays Tk 2.50 per share, whatever the share trades at. A 25% bonus dividend instead gives 25 extra shares per 100 held and pays no cash.",
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

      <header className="ms-pagehead">
        <h1 className="ms-page-h1">
          <span className="ms-page-kicker">Dhaka Stock Exchange</span>
          <span className="ms-page-h1-main">Dividend Calendar</span>
        </h1>
        <span className="ms-page-date">
          {data.stats.declarations_tracked} declarations tracked · updated{" "}
          {formatDate(data.today)}
        </span>
      </header>

      <CalendarSummary data={data} />

      <RecordDateBoard events={data.record_dates} />

      <AgmBoard events={data.agms} />

      <TopCashDividends events={data.top_cash_dividends} />

      <RecentDeclarations events={data.recent_declarations} />

      <HowDividendsWork data={data} />
    </>
  );
}
