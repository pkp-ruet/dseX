import Link from "next/link";

/**
 * Footer columns mirror the drawer (components/layout/Navbar.tsx NAV_GROUPS)
 * exactly — same three groups, same labels, one label per URL. Secondary pages
 * live on the hub pages' HubLinks strip, not here.
 */
type FootLink = { href: string; label: string; bn?: boolean };

const marketsLinks: FootLink[] = [
  { href: "/dse-today", label: "DSE Today" },
  { href: "/market-analysis", label: "Market Analysis" },
  { href: "/dividend-calendar", label: "Dividend Calendar" },
  { href: "/sectors", label: "Sectors" },
  { href: "/share-bazar", label: "আজকের শেয়ার বাজার", bn: true },
];

const findLinks: FootLink[] = [
  { href: "/dsestockranking", label: "Rankings" },
  { href: "/stocks", label: "Browse All Stocks" },
  { href: "/buy-sell-signals", label: "Buy/Sell Signals" },
  { href: "/stock-insights", label: "Stock Lists" },
  { href: "/assistant", label: "TopStock AI" },
];

const learnLinks: FootLink[] = [
  { href: "/learn", label: "Guides" },
  { href: "/blog", label: "বাংলা ব্লগ", bn: true },
  { href: "/about", label: "How we score" },
];

const accountLinks: FootLink[] = [
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/alerts", label: "Price Alerts" },
];

// /about is already "How we score" under Learn — one label per URL.
const legalLinks: FootLink[] = [
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

function Column({ title, links }: { title: string; links: FootLink[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">{title}</h3>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              lang={l.bn ? "bn" : undefined}
              className={`site-footer-link inline-flex items-center min-h-10 text-sm text-text-muted hover:text-primary transition-colors${l.bn ? " font-bn" : ""}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // The footer carries the page's bottom clearance for the fixed mobile bottom
    // bar (+ iOS home indicator) — see `.site-footer` in app/styles/nav.css.
    <footer className="site-footer mt-auto w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="np-footer-modern">
          {/* Top: brand + link columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 md:gap-6">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-3">
              <div className="np-footer-brand">TopStockBD</div>
              <p className="np-footer-tagline mt-1.5">
                Fundamental scoring for Dhaka&apos;s market
              </p>
              <a
                href="mailto:topstockbd@gmail.com"
                className="inline-flex items-center gap-2 mt-3 min-h-10 text-sm font-medium text-primary-ink hover:underline"
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

            <div className="md:col-span-2"><Column title="Markets" links={marketsLinks} /></div>
            <div className="md:col-span-2"><Column title="Find stocks" links={findLinks} /></div>
            <div className="md:col-span-2"><Column title="Learn" links={learnLinks} /></div>
            <div className="md:col-span-3 grid grid-cols-2 gap-6 sm:grid-cols-1 md:grid-cols-2">
              <Column title="Account" links={accountLinks} />
              <Column title="Company" links={legalLinks} />
            </div>
          </div>

          {/* SEO blurb */}
          <p className="text-xs text-text-muted leading-relaxed mt-8 pt-6 border-t border-border/20">
            TopStockBD covers <strong>DSE share price</strong> today, <strong>Dhaka Stock Exchange</strong> (DSEX) live data,{" "}
            <strong>Bangladesh stock market</strong> rankings, <strong>DSE news</strong>, BD stock market signals,{" "}
            and <strong>DSE share price list</strong> — free fundamental analysis for every listed company.{" "}
            Learn <strong>how to invest in DSE</strong>, <strong>how to buy shares in Bangladesh</strong>,{" "}
            how to open a BO account, find <strong>best stocks in Bangladesh</strong>,{" "}
            <strong>dividend stocks</strong>, <strong>blue chip stocks Bangladesh</strong>,{" "}
            and <strong>undervalued stocks DSE</strong> using P/E ratio and fundamental analysis.
          </p>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-border/20">
            <p className="text-xs text-text-muted">
              © {year} TopStockBD. All rights reserved.
            </p>
            <p className="text-xs text-text-muted text-center sm:text-right">
              Not investment advice. For informational purposes only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
