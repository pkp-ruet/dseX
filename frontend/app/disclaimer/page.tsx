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
      <main className="max-w-2xl mx-auto px-4 py-10 sm:py-12 space-y-10">

        {/* Hero */}
        <section className="soft-card ambient-panel p-6 sm:p-8 space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--primary-ink)]">
            Disclaimer
          </span>
          <h1 className="text-[1.85rem] sm:text-[2.4rem] font-bold leading-[1.1] tracking-tight text-[var(--ink)]">
            Disclaimer
          </h1>
          <p className="text-sm font-medium text-[var(--ink-muted)]">Last updated: May 2025</p>
        </section>

        {/* Primary disclaimer — most prominent */}
        <section className="soft-card p-6 space-y-3.5 border-l-4 border-l-[var(--negative)]">
          <h2 className="text-[1.15rem] font-bold text-[var(--ink)]">
            Not financial advice
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            TopStockBD is <strong className="text-[var(--ink)]">not a financial advisor</strong>,
            investment advisor, broker, or dealer. Nothing on this website —
            including stock scores, rankings, signals, or any other content —
            constitutes financial advice, investment advice, trading advice, or
            any other type of advice.
          </p>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            All data, scores, and analysis published on TopStockBD are{" "}
            <strong className="text-[var(--ink)]">for informational purposes only</strong>.
            You should not make any investment decision based solely on what
            you read here.
          </p>
          <p className="text-[1.0625rem] font-bold text-[var(--ink)]">
            Invest at your own risk.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            No price predictions
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            The stock score and all other metrics on TopStockBD are based on
            historical financial data. They reflect how a company has performed
            in the past — not how its stock price will move in the future. A
            high score does not mean a stock will go up. A low score does not
            mean it will go down.
          </p>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            Past financial performance is not a reliable indicator of future
            price performance.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Data accuracy
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            We source data from publicly available information including the
            Dhaka Stock Exchange (DSE) and company disclosures. While we make
            reasonable efforts to ensure accuracy, we cannot guarantee that all
            data on this site is complete, current, or error-free.
          </p>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            Always verify important figures directly from official sources such
            as DSE company filings, BSEC disclosures, or the company&apos;s
            own annual reports before making any decision.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            No broker relationship
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            TopStockBD is not affiliated with any brokerage, financial
            institution, or regulated entity. We do not execute trades, manage
            portfolios, or earn any commission from investment activity. We
            have no financial relationship with any company listed on this
            site.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Limitation of liability
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            To the fullest extent permitted by law, TopStockBD and its
            operators shall not be liable for any losses, damages, or
            financial harm resulting from your use of or reliance on
            information provided on this site. Your use of this website is
            entirely at your own risk.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Do your own research
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            Before investing in any stock, we strongly encourage you to:
          </p>
          <ul className="space-y-3">
            {[
              "Read the company's annual report and financial statements",
              "Consult a qualified, licensed financial advisor",
              "Understand your own risk tolerance and investment goals",
              "Consider how any investment fits your broader portfolio",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
                <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="pt-2 flex gap-4 flex-wrap items-center">
          <Link
            href="/about"
            className="text-[0.95rem] font-semibold text-[var(--primary)] hover:underline"
          >
            About TopStockBD →
          </Link>
          <Link
            href="/privacy-policy"
            className="text-[0.95rem] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            Privacy Policy
          </Link>
        </div>

      </main>
    </>
  );
}
