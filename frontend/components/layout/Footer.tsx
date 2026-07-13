import Link from "next/link";

const exploreLinks = [
  { href: "/dsestockranking", label: "Stock Rankings" },
  { href: "/market-analysis", label: "Market Analysis" },
  { href: "/dse-today", label: "DSE Today" },
  { href: "/stocks", label: "Browse Stocks" },
  { href: "/stock-insights", label: "Stock Lists" },
];

const learnLinks = [
  { href: "/learn", label: "Beginner's Guide" },
  { href: "/blog", label: "বাংলা ব্লগ" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "Behind the Score" },
];

const legalLinks = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="np-footer-modern">
          {/* Top: brand + link columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 md:gap-6">
            {/* Brand */}
            <div className="md:col-span-5">
              <div className="np-footer-brand">TopStockBD</div>
              <p className="np-footer-tagline mt-1.5">
                Fundamental scoring for Dhaka&apos;s market
              </p>
              <a
                href="mailto:topstockbd@gmail.com"
                className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-[var(--primary-ink)] hover:underline"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                topstockbd@gmail.com
              </a>
            </div>

            {/* Explore */}
            <div className="md:col-span-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Explore
              </h3>
              <ul className="space-y-2">
                {exploreLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--ink-2)] hover:text-[var(--primary)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Learn / tools */}
            <div className="md:col-span-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Learn
              </h3>
              <ul className="space-y-2">
                {learnLinks.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--ink-2)] hover:text-[var(--primary)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company / legal */}
            <div className="md:col-span-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Company
              </h3>
              <ul className="space-y-2">
                {legalLinks.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--ink-2)] hover:text-[var(--primary)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* SEO blurb */}
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-8 pt-6 border-t border-white/10">
            TopStockBD covers <strong>DSE share price</strong> today, <strong>Dhaka Stock Exchange</strong> (DSEX) live data,{" "}
            <strong>Bangladesh stock market</strong> rankings, <strong>DSE news</strong>, BD stock market signals,{" "}
            and <strong>DSE share price list</strong> — free fundamental analysis for every listed company.{" "}
            Learn <strong>how to invest in DSE</strong>, <strong>how to buy shares in Bangladesh</strong>,{" "}
            how to open a BO account, find <strong>best stocks in Bangladesh</strong>,{" "}
            <strong>dividend stocks</strong>, <strong>blue chip stocks Bangladesh</strong>,{" "}
            and <strong>undervalued stocks DSE</strong> using P/E ratio and fundamental analysis.
          </p>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-[var(--text-muted)]">
              © {year} TopStockBD. All rights reserved.
            </p>
            <p className="text-[11px] text-[var(--text-muted)] text-center sm:text-right">
              Not investment advice. For informational purposes only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
