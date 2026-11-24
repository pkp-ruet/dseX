import Link from "@/components/ui/Link";

import { T } from "@/components/i18n/T";
import FooterFold from "@/components/layout/FooterFold";
import { PREMIUM_RULE } from "@/lib/premium-jobs";
import { PLACES } from "@/lib/places";

/**
 * The footer lists the map (2026-11-20, `lib/places.ts`): the same four
 * places and the same page names as the menu, plus Account. Learn's first
 * row opens the guides in English and the Bangla blog in Bengali.
 *
 * Redone 2026-11-18: a light card like the rest of the site, and on phones
 * each group is one row that opens in place (`FooterFold`). The company links
 * (contact, privacy, disclaimer, refund) sit in the bottom line at every
 * width. Styles `ft-*` in app/styles/nav.css.
 */
type FootLink = { key: string; href: string; hrefBn?: string; en: string; bn: string };

const accountLinks: FootLink[] = [
  { key: "premium", href: "/premium", en: "Premium", bn: "প্রিমিয়াম" },
  { key: "profile", href: "/profile", en: "Profile", bn: "প্রোফাইল" },
];

// /about is already "How we score" under Learn — one label per URL.
const legalLinks: FootLink[] = [
  { key: "contact", href: "/contact", en: "Contact", bn: "যোগাযোগ" },
  { key: "privacy", href: "/privacy-policy", en: "Privacy policy", bn: "গোপনীয়তা নীতি" },
  { key: "disclaimer", href: "/disclaimer", en: "Disclaimer", bn: "দায়মুক্তি" },
  { key: "refund", href: "/refund-policy", en: "Refund policy", bn: "টাকা ফেরতের নীতি" },
];

const GROUPS: { id: string; title: { en: string; bn: string }; links: FootLink[] }[] = [
  ...PLACES.map((pl) => ({
    id: `ft-${pl.key}`,
    title: pl.name,
    // Every page with an address of its own: the lists that open from /lists
    // stay here (a link from every page, for search), the research anchor does not.
    links: pl.pages.filter((p) => !p.href.includes("#")).map((p) => ({ key: p.key, href: p.href, hrefBn: p.hrefBn, en: p.name.en, bn: p.name.bn })),
  })),
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
                      <li key={l.key}>
                        {l.hrefBn ? (
                          <>
                            <Link href={l.href} data-l="en" lang="en" className="ft-link">
                              {l.en}
                            </Link>
                            <Link href={l.hrefBn} data-l="bn" lang="bn" className="ft-link">
                              {l.bn}
                            </Link>
                          </>
                        ) : (
                          <Link href={l.href} className="ft-link">
                            <T en={l.en} bn={l.bn} />
                          </Link>
                        )}
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
                <li key={l.key}>
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
