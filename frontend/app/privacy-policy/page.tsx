import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — TopStockBD",
  description:
    "TopStockBD privacy policy. Learn how we use cookies, third-party advertising vendors (Google AdSense), and analytics on our Dhaka Stock Exchange data platform.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy — TopStockBD",
    description:
      "How TopStockBD uses cookies, Google AdSense, and analytics. Your privacy matters.",
    url: "/privacy-policy",
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
      "@id": `${BASE_URL}/privacy-policy`,
      url: `${BASE_URL}/privacy-policy`,
      name: "Privacy Policy — TopStockBD",
      description:
        "Privacy policy for TopStockBD — cookies, third-party vendors, and data use.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Privacy Policy",
          item: `${BASE_URL}/privacy-policy`,
        },
      ],
    },
  ],
};

export default function PrivacyPolicyPage() {
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
            Privacy
          </span>
          <h1 className="text-[1.85rem] sm:text-[2.4rem] font-bold leading-[1.1] tracking-tight text-[var(--ink)]">
            Privacy Policy
          </h1>
          <p className="text-sm font-medium text-[var(--ink-muted)]">Last updated: May 2025</p>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            This privacy policy explains how TopStockBD (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects and uses
            information when you visit{" "}
            <strong className="text-[var(--ink)]">topstockbd.com</strong>.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Information we collect
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            TopStockBD does not require you to create an account or provide
            personal information to use the site. The only personal data stored
            locally is your watchlist, which is saved in your browser&apos;s
            localStorage and never transmitted to our servers.
          </p>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            We may collect anonymous, aggregated usage data through third-party
            analytics services (such as Google Analytics) to understand how
            visitors use the site. This data does not identify you personally.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">Cookies</h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            TopStockBD uses cookies. Cookies are small text files placed on
            your device by websites you visit. We use cookies for the following
            purposes:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
              <span><strong className="text-[var(--ink)]">Analytics:</strong> to understand which pages are visited and how users navigate the site</span>
            </li>
            <li className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
              <span><strong className="text-[var(--ink)]">Advertising:</strong> to serve relevant advertisements through Google AdSense (see below)</span>
            </li>
          </ul>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            You can disable cookies in your browser settings, though some
            features of the site may not function as expected if you do.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Third-party advertising (Google AdSense)
          </h2>
          <div className="soft-card p-5 space-y-3">
            <p className="text-[0.98rem] leading-[1.7] text-[var(--ink-2)]">
              TopStockBD uses Google AdSense to display advertisements. Google
              AdSense uses cookies to serve ads based on your prior visits to
              this and other websites.
            </p>
            <p className="text-[0.98rem] leading-[1.7] text-[var(--ink-2)]">
              Google&apos;s use of advertising cookies enables it and its
              partners to serve ads to you based on your visit to our site
              and/or other sites on the internet.
            </p>
            <p className="text-[0.98rem] leading-[1.7] text-[var(--ink-2)]">
              You may opt out of personalised advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Google Ads Settings
              </a>
              . Alternatively, you can opt out of third-party vendor use of
              cookies for personalised advertising by visiting{" "}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                aboutads.info
              </a>
              .
            </p>
          </div>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Analytics
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            We may use Google Analytics or similar tools to collect anonymous
            information about how users interact with TopStockBD — such as
            pages visited, time spent on site, and general geographic region.
            This data is aggregated and does not personally identify you.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Data we do not collect
          </h2>
          <ul className="space-y-3">
            {[
              "We do not collect your name, email, or contact details",
              "We do not store financial information of any kind",
              "We do not sell or share your data with third parties beyond what is described above",
              "We do not use your data for purposes other than site analytics and advertising",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
                <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            External links
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            TopStockBD may contain links to external websites. We are not
            responsible for the privacy practices or content of those sites.
            We encourage you to review the privacy policy of any external site
            you visit.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Changes to this policy
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            We may update this privacy policy from time to time. Any changes
            will be posted on this page with an updated date. Continued use of
            the site after changes are posted constitutes your acceptance of
            the updated policy.
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">
            Contact
          </h2>
          <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
            If you have questions about this privacy policy, contact us at{" "}
            <a
              href="mailto:contact@topstockbd.com"
              className="font-medium text-[var(--primary)] hover:underline"
            >
              contact@topstockbd.com
            </a>
            .
          </p>
        </section>

        <div className="pt-2 flex gap-4 flex-wrap items-center">
          <Link
            href="/disclaimer"
            className="text-[0.95rem] font-semibold text-[var(--primary)] hover:underline"
          >
            View Disclaimer →
          </Link>
          <Link
            href="/about"
            className="text-[0.95rem] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            About TopStockBD
          </Link>
        </div>

      </main>
    </>
  );
}
