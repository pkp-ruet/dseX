"use client";

import { authHref } from "@/lib/next-path";
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import WatchlistDot from "@/components/watchlist/WatchlistDot";
import NotificationBell from "@/components/notifications/NotificationBell";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import {
  IconChevron,
  IconClose,
  IconCrown,
  IconDownload,
  IconGrid,
  IconPen,
  IconSearch,
} from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import { userIsPremium } from "@/lib/premium";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import LangSwitch from "@/components/layout/LangSwitch";
import ThemeSwitch, { ThemeToggleButton } from "@/components/layout/ThemeSwitch";
import { PLACES, TAB_PLACES, menuPages, placeOf, type PlacePage } from "@/lib/places";

const OPEN_DRAWER_EVENT = "dsex:open-drawer";

/** Open the menu from anywhere. */
export function openMobileDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_DRAWER_EVENT));
}

/**
 * The ONE menu (mobile drawer = desktop panel) is the map of the app
 * (2026-11-20, `lib/places.ts`): Market · Find · My shares · Learn, each
 * group headed by a link to its place page, then Premium and Install app.
 * The footer, the bottom bar and search read the same file, so a page has
 * one name everywhere. A new page goes into `lib/places.ts`, never here.
 */
/**
 * Page icons for the menu rows — drawn on the ui/icons grid (24 units,
 * `currentColor`, 2px stroke); kept here because only the menu uses them.
 */
function MenuIcon({ name }: { name?: string }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "today":
      return <svg {...p}><path d="M6 20v-5M12 20V8M18 20v-9" /><path d="M4 20h16" /></svg>;
    case "analysis":
      return <svg {...p}><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>;
    case "buylist":
      return <svg {...p}><path d="M10 6h10M10 12h10M10 18h10" /><path d="m3.5 6 1.5 1.5L8 4.5M3.5 12l1.5 1.5L8 10.5M3.5 18l1.5 1.5L8 16.5" /></svg>;
    case "builder":
      return <svg {...p}><rect x="3" y="12" width="5" height="9" rx="1" /><rect x="10" y="7" width="5" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>;
    case "signals":
      return <svg {...p}><path d="M7 3v18M7 3l-3 4M7 3l3 4" /><path d="M17 21V3M17 21l-3-4M17 21l3-4" /></svg>;
    case "picks":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6M15 6h3v3" /></svg>;
    case "rankings":
      return <svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.1" /><circle cx="4.5" cy="12" r="1.1" /><circle cx="4.5" cy="18" r="1.1" /></svg>;
    case "sectors":
      return <svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /></svg>;
    case "results":
      return <svg {...p}><path d="M6 3h9l4 4v14H6Z" /><path d="M15 3v4h4" /><path d="m9 16 2.5-3 2 2 2.5-3.5" /></svg>;
    case "dividend":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M12 13.5v4M10.6 14.2h2.2a1.1 1.1 0 0 1 0 2.2h-1.5a1.1 1.1 0 0 0 0 2.2h2.3" /></svg>;
    case "find":
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6" /><path d="m20 20-3-3" /></svg>;
    case "compare":
      return <svg {...p}><path d="M7 7h12l-3.5-3.5" /><path d="M17 17H5l3.5 3.5" /></svg>;
    case "lists":
      return <svg {...p}><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5M3 18l9 5 9-5" opacity="0.55" /></svg>;
    case "browse":
      return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11M3 14h18" /></svg>;
    case "blog":
      return <svg {...p}><path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5Z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2V5Z" /></svg>;
    case "bangla":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></svg>;
    case "about":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>;
    case "portfolio":
      return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    case "watchlist":
      return <svg {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>;
    case "rules":
      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "updates":
      return <svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useAuth();
  const premium = isLoggedIn && userIsPremium(user);
  const { bn } = useLang();

  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLButtonElement>(null);

  const here = placeOf(pathname);
  const isItemActive = (page: PlacePage) => here?.page?.key === page.key;
  const closeMenu = () => setMenuOpen(false);
  const learn = PLACES.find((p) => p.key === "learn")!.pages[0];

  /** One door, or two when the Bengali reader's door differs (Learn → the blog). */
  const pageLink = (page: PlacePage, className: string, children: ReactNode) => {
    const current = isItemActive(page) ? ("page" as const) : undefined;
    return page.hrefBn ? (
      <>
        <Link href={page.href} data-l="en" lang="en" className={className} aria-current={current} onClick={closeMenu}>
          {children}
        </Link>
        <Link href={page.hrefBn} data-l="bn" lang="bn" className={className} aria-current={current} onClick={closeMenu}>
          {children}
        </Link>
      </>
    ) : (
      <Link href={page.href} className={className} aria-current={current} onClick={closeMenu}>
        {children}
      </Link>
    );
  };

  // Close the menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Keyboard users land inside the menu, on its first control (search).
  useEffect(() => {
    if (menuOpen) searchRef.current?.focus({ preventScroll: true });
  }, [menuOpen]);

  // Close the menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Open the menu from an external trigger (bottom-bar Explore tab)
  useEffect(() => {
    const onOpen = () => setMenuOpen(true);
    window.addEventListener(OPEN_DRAWER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_DRAWER_EVENT, onOpen);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="navbar-header fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="navbar-brand"
            onClick={() => setMenuOpen(false)}
            aria-label={bn ? "TopStockBD — হোম" : "TopStockBD — Home"}
            title={bn ? "হোম" : "Home"}
          >
            <span className="navbar-brand-dse">TopStock</span>
            <span className="navbar-brand-score">BD</span>
          </Link>

          {/* Desktop nav — hidden on mobile via CSS. Every control is one quiet
              40px ghost button (`.navbar-link`, app/styles/nav.css): same
              radius, 16px icons from ui/icons, a fill only on hover / the page
              you are on. Sign up is the one clay button. */}
          <nav className="navbar-nav">
            {/* The four places (2026-11-20, lib/places.ts). Learn opens the
                guides in English and the Bangla blog in Bengali. */}
            {TAB_PLACES.map((place) => (
              <Link
                key={place.key}
                href={place.href}
                className="navbar-link"
                aria-current={here?.place.key === place.key ? "page" : undefined}
              >
                <span className="navbar-link-icon">
                  <T en={place.name.en} bn={place.name.bn} />
                  {place.key === "mine" && <WatchlistDot />}
                </span>
              </Link>
            ))}
            <Link
              href={learn.href}
              data-l="en"
              lang="en"
              className="navbar-link"
              aria-current={here?.place.key === "learn" ? "page" : undefined}
            >
              Learn
            </Link>
            <Link
              href={learn.hrefBn ?? learn.href}
              data-l="bn"
              lang="bn"
              className="navbar-link"
              aria-current={here?.place.key === "learn" ? "page" : undefined}
            >
              শিখুন
            </Link>

            <span className="navbar-nav-divider" aria-hidden="true" />

            <button
              type="button"
              onClick={openGlobalSearch}
              className="navbar-link"
              aria-label={bn ? "শেয়ার খুঁজুন" : "Search stocks"}
              title={bn ? "কোড বা কোম্পানির নাম দিয়ে খুঁজুন" : "Search by code or company name"}
            >
              <IconSearch size={16} />
              <span className="navbar-search-label">
                <T en="Search" bn="খুঁজুন" />
              </span>
              <kbd className="kbd-hint" aria-hidden="true">/</kbd>
            </button>
            <button
              type="button"
              className="navbar-link"
              data-current={menuOpen || undefined}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={bn ? "মেনু খুলুন" : "Open the menu"}
              onClick={() => setMenuOpen(true)}
            >
              <IconGrid size={16} />
              <span className="navbar-menu-label">
                <T en="Menu" bn="মেনু" />
              </span>
            </button>
            <NotificationBell variant="desktop" />
            {isLoggedIn ? (
              <Link
                href="/profile"
                className="navbar-link navbar-profile-btn"
                aria-current={pathname === "/profile" ? "page" : undefined}
                aria-label={
                  bn
                    ? premium
                      ? "আমার প্রোফাইল (প্রিমিয়াম)"
                      : "আমার প্রোফাইল"
                    : premium
                      ? "My profile (Premium)"
                      : "My profile"
                }
              >
                <span className="navbar-profile-avatar">
                  {(user?.display_name?.trim() || "U")[0].toUpperCase()}
                  {/* Members see their membership on every page. */}
                  {premium && (
                    <span className="navbar-premium-badge" aria-hidden="true">
                      <IconCrown size={10} />
                    </span>
                  )}
                </span>
                <span className="navbar-profile-name">
                  {user?.display_name?.trim() || <T en="Profile" bn="প্রোফাইল" />}
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href={authHref("/login", pathname)}
                  className="navbar-link"
                  aria-current={pathname === "/login" ? "page" : undefined}
                >
                  <T en="Sign in" bn="সাইন ইন" />
                </Link>
                <Link href={authHref("/register", pathname)} className="navbar-signup-btn">
                  <T en="Sign up" bn="অ্যাকাউন্ট খুলুন" />
                </Link>
              </>
            )}
            <ThemeToggleButton className="ml-1" />
            <LangSwitch className="ml-2" />
          </nav>

          {/* Mobile right controls — hidden on desktop via CSS */}
          <div className="navbar-mobile-controls">
            <LangSwitch />
            <NotificationBell variant="mobile" />
            {/* Search is the bottom bar's middle tab on phones. */}
            <button
              className="navbar-hamburger"
              aria-controls="mobile-menu"
              aria-label={bn ? (menuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন") : menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className={`navbar-hamburger-icon${menuOpen ? " open" : ""}`}>
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* The menu (2026-10-28) — phones: a full-screen white sheet · desktop: a
          panel that drops under the navbar. No tiles in boxes: search first,
          then your account, four shortcuts, then the three groups as plain
          rows (icon · name · one line on what it is). The page you are on
          wears the navbar's current-page fill. On desktop the groups sit in
          three columns. Styles: app/styles/nav.css → "Menu". */}
      <div
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label={bn ? "মেনু" : "Menu"}
        onClick={(e) => {
          // Backdrop click (desktop panel) closes; panel clicks don't.
          if (e.target === e.currentTarget) closeMenu();
        }}
      >
        <div className="mobile-menu-panel">
          <div className="mobile-menu-header">
            <Link
              href="/"
              className="mobile-menu-brand"
              onClick={closeMenu}
              aria-label={bn ? "TopStockBD — হোম" : "TopStockBD — Home"}
            >
              TopStock<span>BD</span>
            </Link>
            {/* Desktop shows "Menu" instead of the brand (the navbar's brand is right above it). */}
            <span className="mobile-menu-title" aria-hidden="true">
              <T en="Menu" bn="মেনু" />
            </span>
            <button
              type="button"
              className="mobile-menu-close"
              onClick={closeMenu}
              aria-label={bn ? "মেনু বন্ধ করুন" : "Close menu"}
            >
              <IconClose size={20} />
            </button>
          </div>

          <div className="mobile-menu-body">
            {/* Search first — it finds stocks, companies and pages. */}
            <button
              ref={searchRef}
              type="button"
              className="mobile-menu-search"
              onClick={() => {
                closeMenu();
                openGlobalSearch();
              }}
            >
              <IconSearch size={20} />
              <span className="mobile-menu-search-text">
                <T en="Search a stock, company or page" bn="শেয়ার, কোম্পানি বা পেজ খুঁজুন" />
              </span>
              <kbd className="kbd-hint" aria-hidden="true">/</kbd>
            </button>

            {/* Account */}
            {isLoggedIn ? (
              <Link
                href="/profile"
                className="mobile-menu-account"
                aria-current={pathname === "/profile" ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="mobile-menu-account-avatar" aria-hidden="true">
                  {(user?.display_name?.trim() || "U")[0].toUpperCase()}
                  {premium && (
                    <span className="navbar-premium-badge">
                      <IconCrown size={10} />
                    </span>
                  )}
                </span>
                <span className="mobile-menu-account-text">
                  <span className="mobile-menu-account-name">
                    {user?.display_name?.trim() || <T en="My profile" bn="আমার প্রোফাইল" />}
                  </span>
                  <span className="mobile-menu-account-sub">
                    {premium ? (
                      <T en="Premium · profile and settings" bn="প্রিমিয়াম · প্রোফাইল ও সেটিংস" />
                    ) : (
                      <T en="Your profile and settings" bn="আপনার প্রোফাইল ও সেটিংস" />
                    )}
                  </span>
                </span>
                <IconChevron size={16} />
              </Link>
            ) : (
              <div className="mobile-menu-auth">
                <Button href={authHref("/login", pathname)} variant="quiet" size="lg" block onClick={closeMenu}>
                  <T en="Sign in" bn="সাইন ইন" />
                </Button>
                <Button href={authHref("/register", pathname)} variant="primary" size="lg" block onClick={closeMenu}>
                  <T en="Sign up" bn="অ্যাকাউন্ট খুলুন" />
                </Button>
              </div>
            )}

            {/* The four places = the map (2026-11-20, lib/places.ts). A place
                with a place page heads its group with a link to it. */}
            {PLACES.map((place) => (
              <section
                className="mobile-menu-section"
                data-group={place.key}
                key={place.key}
                aria-labelledby={`mm-${place.key}`}
              >
                <h2 id={`mm-${place.key}`} className="mobile-menu-section-label">
                  {place.key === "learn" ? (
                    <T en={place.name.en} bn={place.name.bn} />
                  ) : (
                    <Link href={place.href} className="mobile-menu-place" onClick={closeMenu}>
                      <T en={place.name.en} bn={place.name.bn} />
                      <IconChevron size={14} />
                    </Link>
                  )}
                </h2>
                <ul className="mobile-menu-list">
                  {menuPages(place).map((it) => (
                    <li key={it.key}>
                      {pageLink(
                        it,
                        "mobile-menu-item",
                        <>
                          <span className="mobile-menu-item-icon">
                            <MenuIcon name={it.icon} />
                            {it.key === "shares" && <WatchlistDot />}
                          </span>
                          <span className="mobile-menu-item-text">
                            <span className="mobile-menu-item-label">
                              <T en={it.name.en} bn={it.name.bn} />
                              {it.premium && (
                                <span className="menu-premium" title="Premium">
                                  <IconCrown size={12} />
                                  <span className="sr-only">Premium</span>
                                </span>
                              )}
                            </span>
                            <span className="mobile-menu-item-sub">
                              <T en={it.line.en} bn={it.line.bn} />
                            </span>
                          </span>
                        </>,
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {/* Premium and the app, after the map. */}
            <section className="mobile-menu-section" data-group="quick" aria-labelledby="mm-quick">
              <h2 id="mm-quick" className="mobile-menu-section-label">
                <T en="More" bn="আরও" />
              </h2>
              <div className="mobile-menu-quick">
                <Link
                  href="/premium"
                  className="mobile-menu-shortcut"
                  data-premium
                  aria-current={pathname === "/premium" ? "page" : undefined}
                  onClick={closeMenu}
                >
                  <span className="mobile-menu-shortcut-icon">
                    <IconCrown size={20} />
                  </span>
                  <span className="mobile-menu-shortcut-text">
                    <span className="mobile-menu-shortcut-label">
                      <T en="Premium" bn="প্রিমিয়াম" />
                    </span>
                    <span className="mobile-menu-shortcut-sub">
                      <T en="Everything you get with Premium" bn="প্রিমিয়ামে যা যা পাবেন" />
                    </span>
                  </span>
                </Link>
                <InstallAppButton
                  className="mobile-menu-shortcut mobile-menu-install"
                  label={bn ? "অ্যাপ ইনস্টল করুন" : "Install app"}
                  onClick={closeMenu}
                >
                  <span className="mobile-menu-shortcut-icon">
                    <IconDownload size={20} />
                  </span>
                  <span className="mobile-menu-shortcut-text">
                    <span className="mobile-menu-shortcut-label">
                      <T en="Install app" bn="অ্যাপ ইনস্টল করুন" />
                    </span>
                    <span className="mobile-menu-shortcut-sub">
                      <T en="Open TopStockBD from your home screen" bn="হোম স্ক্রিন থেকেই TopStockBD খুলুন" />
                    </span>
                  </span>
                </InstallAppButton>
                {/* The reader survey (2026-11-24), always open here. */}
                {isLoggedIn && (
                  <Link
                    href="/feedback?src=menu"
                    className="mobile-menu-shortcut"
                    aria-current={pathname === "/feedback" ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    <span className="mobile-menu-shortcut-icon">
                      <IconPen size={20} />
                    </span>
                    <span className="mobile-menu-shortcut-text">
                      <span className="mobile-menu-shortcut-label">
                        <T en="Share your feedback" bn="আপনার মতামত দিন" />
                      </span>
                      <span className="mobile-menu-shortcut-sub">
                        <T en="9 short questions, about 2 minutes" bn="9টি ছোট প্রশ্ন, মোটামুটি 2 মিনিট" />
                      </span>
                    </span>
                  </Link>
                )}
              </div>
            </section>

            {/* Light / dark / like my phone (2026-11-06). */}
            <ThemeSwitch />
          </div>
        </div>
      </div>
    </>
  );
}
