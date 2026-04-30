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
      <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-[var(--ink)]">Privacy Policy</h1>
          <p className="text-[var(--ink-muted)] text-sm">
            Last updated: May 2025
          </p>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            This privacy policy explains how TopStockBD (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects and uses
            information when you visit{" "}
            <strong className="text-[var(--ink)]">topstockbd.com</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Information we collect
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            TopStockBD does not require you to create an account or provide
            personal information to use the site. The only personal data stored
            locally is your watchlist, which is saved in your browser&apos;s
            localStorage and never transmitted to our servers.
          </p>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            We may collect anonymous, aggregated usage data through third-party
            analytics services (such as Google Analytics) to understand how
            visitors use the site. This data does not identify you personally.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Cookies</h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            TopStockBD uses cookies. Cookies are small text files placed on
            your device by websites you visit. We use cookies for the following
            purposes:
          </p>
          <ul className="text-[var(--ink-muted)] text-sm space-y-2 leading-relaxed list-disc list-inside">
            <li>
              <strong className="text-[var(--ink)]">Analytics:</strong> to
              understand which pages are visited and how users navigate the site
            </li>
            <li>
              <strong className="text-[var(--ink)]">Advertising:</strong> to
              serve relevant advertisements through Google AdSense (see below)
            </li>
          </ul>
          <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
            You can disable cookies in your browser settings, though some
            features of the site may not function as expected if you do.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Third-party advertising (Google AdSense)
          </h2>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
              TopStockBD uses Google AdSense to display advertisements. Google
              AdSense uses cookies to serve ads based on your prior visits to
              this and other websites.
            </p>
            <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
              Google&apos;s use of advertising cookies enables it and its
              partners to serve ads to you based on your visit to our site
              and/or other sites on the internet.
            </p>
            <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
              You may opt out of personalised advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                Google Ads Settings
              </a>
              . Alternatively, you can opt out of third-party vendor use of
              cookies for personalised advertising by visiting{" "}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                aboutads.info
              </a>
              .
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Analytics
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            We may use Google Analytics or similar tools to collect anonymous
            information about how users interact with TopStockBD — such as
            pages visited, time spent on site, and general geographic region.
            This data is aggregated and does not personally identify you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Data we do not collect
          </h2>
          <ul className="text-[var(--ink-muted)] text-sm space-y-2 leading-relaxed list-disc list-inside">
            <li>We do not collect your name, email, or contact details</li>
            <li>We do not store financial information of any kind</li>
            <li>
              We do not sell or share your data with third parties beyond what
              is described above
            </li>
            <li>
              We do not use your data for purposes other than site analytics
              and advertising
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            External links
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            TopStockBD may contain links to external websites. We are not
            responsible for the privacy practices or content of those sites.
            We encourage you to review the privacy policy of any external site
            you visit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Changes to this policy
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            We may update this privacy policy from time to time. Any changes
            will be posted on this page with an updated date. Continued use of
            the site after changes are posted constitutes your acceptance of
            the updated policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Contact
          </h2>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            If you have questions about this privacy policy, contact us at{" "}
            <a
              href="mailto:contact@topstockbd.com"
              className="text-[var(--primary)] hover:underline"
            >
              contact@topstockbd.com
            </a>
            .
          </p>
        </section>

        <div className="pt-2 flex gap-3 flex-wrap">
          <Link
            href="/disclaimer"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            View Disclaimer →
          </Link>
          <Link
            href="/about"
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            About TopStockBD
          </Link>
        </div>

      </main>
    </>
  );
}
