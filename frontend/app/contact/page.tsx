import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us — TopStockBD",
  description:
    "Get in touch with the TopStockBD team. Questions about DSE stock data, scores, or the site? We'd love to hear from you.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us — TopStockBD",
    description:
      "Get in touch with the TopStockBD team. Questions about DSE stock data, scores, or the site?",
    url: "/contact",
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
      "@id": `${BASE_URL}/contact`,
      url: `${BASE_URL}/contact`,
      name: "Contact Us — TopStockBD",
      description:
        "Contact TopStockBD for questions about DSE stock data, fundamental scores, or general feedback.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact",
          item: `${BASE_URL}/contact`,
        },
      ],
    },
  ],
};

export default function ContactPage() {
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
            Contact
          </span>
          <h1 className="text-[1.85rem] sm:text-[2.4rem] font-bold leading-[1.1] tracking-tight text-[var(--ink)]">
            Contact Us
          </h1>
          <p className="text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
            Have a question, found an error in the data, or want to share
            feedback about TopStockBD? We&apos;re happy to hear from you.
          </p>
        </section>

        <section className="soft-card p-6 space-y-4">
          <h2 className="text-[1.15rem] font-bold text-[var(--ink)]">Email us</h2>
          <p className="text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
            The best way to reach us is by email. We typically respond within
            1–3 business days.
          </p>
          <a href="mailto:topstockbd@gmail.com" className="ui-btn ui-btn-md ui-btn-primary">
            topstockbd@gmail.com
          </a>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">What to include</h2>
          <ul className="space-y-3">
            <li className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
              <span><strong className="text-[var(--ink)]">Data issues:</strong> include the stock code and what looks wrong</span>
            </li>
            <li className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
              <span><strong className="text-[var(--ink)]">Score questions:</strong> tell us which company and what specifically seems off</span>
            </li>
            <li className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
              <span><strong className="text-[var(--ink)]">General feedback:</strong> anything you&apos;d like to see added or improved</span>
            </li>
          </ul>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">About this site</h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            TopStockBD is an independent tool that analyzes publicly available
            financial data from the Dhaka Stock Exchange (DSE). We are not
            affiliated with DSE, BSEC, or any broker or financial institution.
          </p>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            For more background on the project and what we score, see{" "}
            <Link href="/about" className="font-medium text-[var(--primary)] hover:underline">
              About TopStockBD
            </Link>
            .
          </p>
        </section>

      </main>
    </>
  );
}
