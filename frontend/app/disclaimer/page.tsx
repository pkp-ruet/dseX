import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer — TopStockBD",
  description:
    "TopStockBD is not a financial advisor. All DSE stock data and scores are for informational purposes only. Invest at your own risk.",
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: "Disclaimer — TopStockBD",
    description:
      "TopStockBD is not a financial advisor. All data is for informational purposes only. Invest at your own risk.",
    url: "/disclaimer",
    type: "website",
  },
};

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/disclaimer`,
      url: `${BASE_URL}/disclaimer`,
      name: "Disclaimer — TopStockBD",
      description:
        "Financial disclaimer for TopStockBD. Not financial advice. For informational purposes only.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Disclaimer",
          item: `${BASE_URL}/disclaimer`,
        },
      ],
    },
  ],
};

export default function DisclaimerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-[var(--ink)]">Disclaimer</h1>
          <p className="text-[var(--ink-muted)] text-sm">
            Last updated: May 2025
          </p>
        </section>

        {/* Primary disclaimer — most prominent */}
        <section className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Not financial advice
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            TopStockBD is <strong className="text-[var(--ink)]">not a financial advisor</strong>,
            investment advisor, broker, or dealer. Nothing on this website —
            including stock scores, rankings, signals, or any other content —
            constitutes financial advice, investment advice, trading advice, or
            any other type of advice.
          </p>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            All data, scores, and analysis published on TopStockBD are{" "}
            <strong className="text-[var(--ink)]">for informational purposes only</strong>.
            You should not make any investment decision based solely on what
            you read here.
          </p>
          <p className="font-semibold text-[var(--ink)]">
            Invest at your own risk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            No price predictions
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            The DSEF Score and all other metrics on TopStockBD are based on
            historical financial data. They reflect how a company has performed
            in the past — not how its stock price will move in the future. A
            high score does not mean a stock will go up. A low score does not
            mean it will go down.
          </p>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            Past financial performance is not a reliable indicator of future
            price performance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Data accuracy
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            We source data from publicly available information including the
            Dhaka Stock Exchange (DSE) and company disclosures. While we make
            reasonable efforts to ensure accuracy, we cannot guarantee that all
            data on this site is complete, current, or error-free.
          </p>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            Always verify important figures directly from official sources such
            as DSE company filings, BSEC disclosures, or the company&apos;s
            own annual reports before making any decision.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            No broker relationship
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            TopStockBD is not affiliated with any brokerage, financial
            institution, or regulated entity. We do not execute trades, manage
            portfolios, or earn any commission from investment activity. We
            have no financial relationship with any company listed on this
            site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Limitation of liability
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            To the fullest extent permitted by law, TopStockBD and its
            operators shall not be liable for any losses, damages, or
            financial harm resulting from your use of or reliance on
            information provided on this site. Your use of this website is
            entirely at your own risk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Do your own research
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            Before investing in any stock, we strongly encourage you to:
          </p>
          <ul className="text-[var(--ink-muted)] text-sm space-y-2 leading-relaxed list-disc list-inside">
            <li>Read the company&apos;s annual report and financial statements</li>
            <li>Consult a qualified, licensed financial advisor</li>
            <li>Understand your own risk tolerance and investment goals</li>
            <li>Consider how any investment fits your broader portfolio</li>
          </ul>
        </section>

        <div className="pt-2 flex gap-3 flex-wrap">
          <Link
            href="/about"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            About TopStockBD →
          </Link>
          <Link
            href="/privacy-policy"
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Privacy Policy
          </Link>
        </div>

      </main>
    </>
  );
}
