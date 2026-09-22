import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Contact Us",
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
      <div className="page-narrow space-y-10">
        <PageHeader
          eyebrow="Contact"
          title="Contact Us"
          bn="প্রশ্ন, ভুল তথ্য বা মতামত — ইমেইলে জানান, আমরা উত্তর দেব।"
          lead={<>Have a question, found an error in the data, or want to share feedback about TopStockBD? We&apos;re happy to hear from you.</>}
        />

        <section className="soft-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-text-main">Email us</h2>
          <p className="text-lg leading-[1.7] text-text-muted">
            The best way to reach us is by email. We typically respond within
            1–3 business days.
          </p>
          <a href="mailto:topstockbd@gmail.com" className="btn-primary">
            topstockbd@gmail.com
          </a>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">What to include</h2>
          <ul className="space-y-3">
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <span><strong className="text-text-main">Data issues:</strong> include the stock code and what looks wrong</span>
            </li>
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <span><strong className="text-text-main">Score questions:</strong> tell us which company and what specifically seems off</span>
            </li>
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <span><strong className="text-text-main">General feedback:</strong> anything you&apos;d like to see added or improved</span>
            </li>
          </ul>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">About this site</h2>
          <p className="text-lg leading-[1.78] text-text-muted">
            TopStockBD is an independent tool that analyzes publicly available
            financial data from the Dhaka Stock Exchange (DSE). We are not
            affiliated with DSE, BSEC, or any broker or financial institution.
          </p>
          <p className="text-lg leading-[1.78] text-text-muted">
            For more background on the project and what we score, see{" "}
            <Link href="/about" className="font-medium text-primary hover:underline">
              About TopStockBD
            </Link>
            .
          </p>
        </section>

      </div>
    </>
  );
}
