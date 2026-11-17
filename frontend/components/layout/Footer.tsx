import Link from "@/components/ui/Link";

import { T } from "@/components/i18n/T";
import FooterFold from "@/components/layout/FooterFold";
import { PREMIUM_RULE } from "@/lib/premium-jobs";

/**
 * Footer groups mirror the drawer (components/layout/Navbar.tsx NAV_GROUPS)
 * exactly: same three groups, same labels, one label per URL, plus Account.
 * Secondary pages live on the hub pages' HubLinks strip, not here. Kept as its
 * own list because this is a server component and NAV_GROUPS lives in a
 * client file.
 *
 * Redone 2026-11-18 (user: "make the … footer match with current design. the
 * footer is very long on mobile"): a light card like the rest of the site
 * (it was a navy panel), and on phones each group is one row that opens in
 * place (`FooterFold`) — about 1,300px of stacked links became about 600px.
 * The company links (contact, privacy, disclaimer, refund) sit in the bottom
 * line at every width. Styles `ft-*` in app/styles/nav.css.
 */
type FootLink = { href: string; en: string; bn: string };

const marketsLinks: FootLink[] = [
  { href: "/dse-today", en: "Market today", bn: "আজকের শেয়ার বাজার" },
  { href: "/dividend-calendar", en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
  { href: "/results", en: "Quarterly results", bn: "প্রান্তিকের ফল" },
  { href: "/sectors", en: "Sectors", bn: "সেক্টর" },
  { href: "/stock-insights", en: "Premium research", bn: "প্রিমিয়াম গবেষণা" },
];

const findLinks: FootLink[] = [
  { href: "/buy-list", en: "Buy List", bn: "কেনার তালিকা" },
  { href: "/screener", en: "Stock screener", bn: "স্টক স্ক্রিনার" },
  { href: "/compare-stocks", en: "Compare stocks", bn: "শেয়ার তুলনা" },
  { href: "/for-you", en: "Based on your shares", bn: "আপনার শেয়ার দেখে বাছাই" },
  { href: "/dsestockranking", en: "Company ranking", bn: "কোম্পানির র‍্যাঙ্কিং" },
  { href: "/stocks", en: "All stocks", bn: "সব শেয়ার" },
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

const GROUPS: { id: string; title: { en: string; bn: string }; links: FootLink[] }[] = [
  { id: "ft-markets", title: { en: "Markets", bn: "বাজার" }, links: marketsLinks },
  { id: "ft-find", title: { en: "Find stocks", bn: "শেয়ার খুঁজুন" }, links: findLinks },
  { id: "ft-learn", title: { en: "Learn", bn: "শিখুন" }, links: learnLinks },
  { id: "ft-account", title: { en: "Account", bn: "অ্যাকাউন্ট" }, links: accountLinks },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // The footer carries the page's bottom clearance for the fixed mobile bottom
    // bar (+ iOS home indicator) — see `.site-footer` in app/styles/nav.css.
    <footer className="site-footer mt-auto w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="ft">
          <div className="ft-top">
            <div className="ft-about-col">
              <p className="ft-brand">
                TopStock<span>BD</span>
              </p>
              <p className="ft-tag">
                <T
                  en="Clear, careful research on every company listed on the Dhaka Stock Exchange."
                  bn="ঢাকা স্টক এক্সচেঞ্জের প্রতিটি কোম্পানির সহজ ও যত্নশীল বিশ্লেষণ।"
                />
              </p>
              {/* The free / Premium rule, said the same way on every page (lib/premium-jobs.ts). */}
              <Link href="/premium" prefetch={false} className="ft-rule">
                <T en={PREMIUM_RULE.en} bn={PREMIUM_RULE.bn} />
              </Link>
              <a href="mailto:topstockbd@gmail.com" className="ft-mail">
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

            <div className="ft-groups">
              {GROUPS.map((g) => (
                <FooterFold key={g.id} id={g.id} title={g.title}>
                  <ul className="ft-list">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="ft-link">
                          <T en={l.en} bn={l.bn} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </FooterFold>
              ))}
            </div>
          </div>

          {/* About (SEO text): a folded row on phones, a plain paragraph from 768px. */}
          <FooterFold id="ft-about" title={{ en: "About TopStockBD", bn: "TopStockBD সম্পর্কে" }} className="ft-about">
            <p className="ft-seo">
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
          </FooterFold>

          {/* Bottom line: the company links, then © and not-advice. */}
          <div className="ft-bottom">
            <ul className="ft-legal">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <T en={l.en} bn={l.bn} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="ft-copy">
              © {year} TopStockBD.{" "}
              <T
                en="Information to help you decide, not investment advice."
                bn="এই তথ্য আপনাকে সিদ্ধান্ত নিতে সাহায্য করার জন্য, বিনিয়োগের পরামর্শ নয়।"
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
