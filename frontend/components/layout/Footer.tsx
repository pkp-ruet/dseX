import Link from "next/link";

import { T } from "@/components/i18n/T";

/**
 * Footer columns mirror the drawer (components/layout/Navbar.tsx NAV_GROUPS)
 * exactly: same three groups, same labels, one label per URL. Secondary pages
 * live on the hub pages' HubLinks strip, not here. Kept as its own list because
 * this is a server component and NAV_GROUPS lives in a client file.
 */
type FootLink = { href: string; en: string; bn: string };

const marketsLinks: FootLink[] = [
  { href: "/dse-today", en: "DSE today", bn: "আজকের DSE" },
  { href: "/market-analysis", en: "Market analysis", bn: "বাজার বিশ্লেষণ" },
  { href: "/dividend-calendar", en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
  { href: "/results", en: "Quarterly results", bn: "প্রান্তিকের ফল" },
  { href: "/sectors", en: "Sectors", bn: "সেক্টর" },
  { href: "/share-bazar", en: "Today's market in Bangla", bn: "আজকের শেয়ার বাজার" },
];

const findLinks: FootLink[] = [
  { href: "/dsestockranking", en: "Rankings", bn: "র‍্যাঙ্কিং" },
  { href: "/stocks", en: "All stocks", bn: "সব শেয়ার" },
  { href: "/buy-sell-signals", en: "Buy and sell signals", bn: "কেনা-বেচার সংকেত" },
  { href: "/screener", en: "Stock screener", bn: "স্টক স্ক্রিনার" },
  { href: "/stock-insights", en: "Stock lists", bn: "শেয়ারের তালিকা" },
  { href: "/assistant", en: "TopStock AI", bn: "TopStock AI" },
];

const learnLinks: FootLink[] = [
  { href: "/learn", en: "Guides", bn: "ইংরেজি গাইড" },
  { href: "/blog", en: "Bangla blog", bn: "বাংলা ব্লগ" },
  { href: "/about", en: "How we score", bn: "আমরা কীভাবে স্কোর করি" },
];

const accountLinks: FootLink[] = [
  { href: "/watchlist", en: "Watchlist", bn: "ওয়াচলিস্ট" },
  { href: "/portfolio", en: "Portfolio", bn: "পোর্টফোলিও" },
  { href: "/alerts", en: "Price alerts", bn: "প্রাইস অ্যালার্ট" },
  { href: "/premium", en: "Premium", bn: "প্রিমিয়াম" },
];

// /about is already "How we score" under Learn — one label per URL.
const legalLinks: FootLink[] = [
  { href: "/contact", en: "Contact", bn: "যোগাযোগ" },
  { href: "/privacy-policy", en: "Privacy policy", bn: "গোপনীয়তা নীতি" },
  { href: "/disclaimer", en: "Disclaimer", bn: "দায়মুক্তি" },
  { href: "/refund-policy", en: "Refund policy", bn: "টাকা ফেরতের নীতি" },
];

function Column({ title, links }: { title: { en: string; bn: string }; links: FootLink[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted mb-2">
        <T en={title.en} bn={title.bn} />
      </h3>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="site-footer-link inline-flex items-center min-h-10 text-sm text-text-muted hover:text-primary transition-colors"
            >
              <T en={l.en} bn={l.bn} />
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
                <T
                  en="Clear, careful research on every company listed on the Dhaka Stock Exchange."
                  bn="ঢাকা স্টক এক্সচেঞ্জের প্রতিটি কোম্পানির সহজ ও যত্নশীল বিশ্লেষণ।"
                />
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

            <div className="md:col-span-2">
              <Column title={{ en: "Markets", bn: "বাজার" }} links={marketsLinks} />
            </div>
            <div className="md:col-span-2">
              <Column title={{ en: "Find stocks", bn: "শেয়ার খুঁজুন" }} links={findLinks} />
            </div>
            <div className="md:col-span-2">
              <Column title={{ en: "Learn", bn: "শিখুন" }} links={learnLinks} />
            </div>
            <div className="md:col-span-3 grid grid-cols-2 gap-6 sm:grid-cols-1 md:grid-cols-2">
              <Column title={{ en: "Account", bn: "অ্যাকাউন্ট" }} links={accountLinks} />
              <Column title={{ en: "Company", bn: "প্রতিষ্ঠান" }} links={legalLinks} />
            </div>
          </div>

          {/* SEO blurb */}
          <p className="text-xs text-text-muted leading-relaxed mt-8 pt-6 border-t border-border/20">
            <T
              en={
                <>
                  TopStockBD shows today&apos;s <strong>DSE share price</strong> list, live{" "}
                  <strong>Dhaka Stock Exchange</strong> (DSEX) data, <strong>Bangladesh stock market</strong>{" "}
                  rankings and <strong>DSE news</strong>, with a careful look at every listed company. You can
                  learn <strong>how to invest in DSE</strong> and <strong>how to buy shares in Bangladesh</strong>,
                  open a BO account, and find <strong>dividend stocks</strong> and the{" "}
                  <strong>best stocks in Bangladesh</strong> for your needs.
                </>
              }
              bn={
                <>
                  TopStockBD-তে পাবেন আজকের <strong>ডিএসই শেয়ারের দাম</strong>, ঢাকা স্টক এক্সচেঞ্জের (DSEX)
                  হালনাগাদ তথ্য, <strong>শেয়ার বাজারের</strong> র‍্যাঙ্কিং আর খবর, সঙ্গে প্রতিটি কোম্পানির
                  যত্নশীল বিশ্লেষণ। কীভাবে বিনিয়োগ শুরু করবেন, বিও অ্যাকাউন্ট খুলবেন আর ভালো{" "}
                  <strong>ডিভিডেন্ড</strong> দেওয়া শেয়ার খুঁজবেন, তাও এখানে সহজ ভাষায় শিখতে পারবেন।
                </>
              }
            />
          </p>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-border/20">
            <p className="text-xs text-text-muted">
              © {year} TopStockBD. <T en="All rights reserved." bn="সর্বস্বত্ব সংরক্ষিত।" />
            </p>
            <p className="text-xs text-text-muted text-center sm:text-right">
              <T
                en="This is information to help you decide, not investment advice."
                bn="এই তথ্য আপনাকে সিদ্ধান্ত নিতে সাহায্য করার জন্য, এটি বিনিয়োগের পরামর্শ নয়।"
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
