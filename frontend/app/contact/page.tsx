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
      <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-[var(--ink)]">Contact Us</h1>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            Have a question, found an error in the data, or want to share
            feedback about TopStockBD? We&apos;re happy to hear from you.
          </p>
        </section>

        <section className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Email us</h2>
          <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
            The best way to reach us is by email. We typically respond within
            1–3 business days.
          </p>
          <a
            href="mailto:topstockbd@gmail.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            topstockbd@gmail.com
          </a>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">What to include</h2>
          <ul className="text-[var(--ink-muted)] text-sm space-y-2 leading-relaxed list-disc list-inside">
            <li>
              <strong className="text-[var(--ink)]">Data issues:</strong> include
              the stock code and what looks wrong
            </li>
            <li>
              <strong className="text-[var(--ink)]">Score questions:</strong> tell
              us which company and what specifically seems off
            </li>
            <li>
              <strong className="text-[var(--ink)]">General feedback:</strong>{" "}
              anything you&apos;d like to see added or improved
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">About this site</h2>
          <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
            TopStockBD is an independent tool that analyzes publicly available
            financial data from the Dhaka Stock Exchange (DSE). We are not
            affiliated with DSE, BSEC, or any broker or financial institution.
          </p>
          <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
            For more background on the project and what we score, see{" "}
            <Link
              href="/about"
              className="text-[var(--primary)] hover:underline"
            >
              About TopStockBD
            </Link>
            .
          </p>
        </section>

      </main>
    </>
  );
}
