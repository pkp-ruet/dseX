"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import WatchlistDot from "@/components/watchlist/WatchlistDot";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import { IconBriefcase, IconCrown, IconGrid, IconSearch, IconStar } from "@/components/ui/icons";
import { userIsPremium } from "@/lib/premium";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import LangSwitch from "@/components/layout/LangSwitch";

const OPEN_DRAWER_EVENT = "dsex:open-drawer";

/** Open the nav drawer from anywhere (the bottom-bar Explore tab). */
export function openMobileDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_DRAWER_EVENT));
}

export type NavItem = {
  href: string;
  label: string;
  labelBn: string;
  sub?: string;
  subBn?: string;
  icon?: string;
};
export type NavGroup = { id: string; label: string; labelBn: string; accent?: string; items: NavItem[] };

/**
 * The ONE menu (mobile drawer = desktop panel; the footer mirrors it). Three
 * groups + quick access; nothing else is in the global navigation. Secondary
 * discovery pages are reached through `components/layout/HubLinks.tsx` on the
 * hub pages instead (2026-09-22). Every label is a pair: the menu follows the
 * navbar language switch like everything else.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "markets",
    label: "Markets",
    labelBn: "বাজার",
    accent: "info",
    items: [
      { href: "/dse-today", label: "DSE today", labelBn: "আজকের DSE", sub: "Today's prices and biggest moves", subBn: "আজকের দাম আর বড় ওঠানামা", icon: "today" },
      { href: "/market-analysis", label: "Market analysis", labelBn: "বাজার বিশ্লেষণ", sub: "Is the market up or down, cheap or expensive?", subBn: "বাজার উঠছে না নামছে, দাম কম না বেশি", icon: "analysis" },
      { href: "/dividend-calendar", label: "Dividend calendar", labelBn: "ডিভিডেন্ড ক্যালেন্ডার", sub: "Record dates and AGMs", subBn: "রেকর্ড ডেট আর এজিএম", icon: "dividend" },
      { href: "/results", label: "Quarterly results", labelBn: "প্রান্তিকের ফল", sub: "Each company's latest profit", subBn: "প্রতিটি কোম্পানির সর্বশেষ মুনাফা", icon: "results" },
      { href: "/sectors", label: "Sectors", labelBn: "সেক্টর", sub: "Compare whole industries", subBn: "পুরো সেক্টর মিলিয়ে দেখুন", icon: "sectors" },
      { href: "/share-bazar", label: "Today's market in Bangla", labelBn: "আজকের শেয়ার বাজার", sub: "A short daily report in Bengali", subBn: "প্রতিদিনের সংক্ষিপ্ত বাজার প্রতিবেদন", icon: "bangla" },
    ],
  },
  {
    id: "find",
    label: "Find stocks",
    labelBn: "শেয়ার খুঁজুন",
    accent: "clay",
    items: [
      { href: "/dsestockranking", label: "Rankings", labelBn: "র‍্যাঙ্কিং", sub: "Every company, scored", subBn: "প্রতিটি কোম্পানির স্কোর", icon: "rankings" },
      { href: "/stocks", label: "All stocks", labelBn: "সব শেয়ার", sub: "The full A–Z list", subBn: "A থেকে Z পুরো তালিকা", icon: "browse" },
      { href: "/buy-sell-signals", label: "Buy and sell signals", labelBn: "কেনা-বেচার সংকেত", sub: "What looks worth buying or selling now", subBn: "এখন কোনটি কেনা বা বিক্রির মতো", icon: "signals" },
      { href: "/screener", label: "Stock screener", labelBn: "স্টক স্ক্রিনার", sub: "Find stocks that fit what you want", subBn: "আপনার চাওয়া অনুযায়ী শেয়ার খুঁজুন", icon: "find" },
      { href: "/stock-insights", label: "Stock lists", labelBn: "শেয়ারের তালিকা", sub: "Ready-made lists", subBn: "তৈরি করা তালিকা", icon: "lists" },
      { href: "/assistant", label: "TopStock AI", labelBn: "TopStock AI", sub: "Ask in plain words", subBn: "সহজ ভাষায় প্রশ্ন করুন", icon: "ai" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    labelBn: "শিখুন",
    accent: "gold",
    items: [
      { href: "/learn", label: "Guides", labelBn: "ইংরেজি গাইড", sub: "Step-by-step guides in English", subBn: "ইংরেজিতে ধাপে ধাপে গাইড", icon: "blog" },
      { href: "/blog", label: "Bangla blog", labelBn: "বাংলা ব্লগ", sub: "Beginner guides in Bengali", subBn: "নতুনদের জন্য সহজ গাইড", icon: "bangla" },
      { href: "/about", label: "How we score", labelBn: "আমরা কীভাবে স্কোর করি", sub: "The five checks, explained", subBn: "পাঁচটি যাচাই, সহজ করে বলা", icon: "about" },
    ],
  },
];

/** Compact stroke icons for the full-page mobile menu tiles. */
function MenuIcon({ name }: { name?: string }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "today":
      return <svg {...p}><path d="M6 20v-5M12 20V8M18 20v-9" /><path d="M4 20h16" /></svg>;
    case "news":
      return <svg {...p}><path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" /><path d="M17 8h3v9a2 2 0 0 1-2 2" /><path d="M7 9h7M7 13h7M7 16h4" /></svg>;
    case "analysis":
      return <svg {...p}><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>;
    case "top20":
      return <svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h2.5a1.5 1.5 0 0 1 0 5H17M7 5H4.5a1.5 1.5 0 0 0 0 5H7" /></svg>;
    case "popular":
      return <svg {...p}><path d="M12 3c1.5 3 4 4 4 7a4 4 0 0 1-8 0c0-1 .4-2 1-2.5C9 9 12 6 12 3Z" /><path d="M12 21a6 6 0 0 0 6-6c0-3-2-5-3.5-7 .3 1.5-.5 3-2.5 4-1.5.8-2 2-2 3a2.5 2.5 0 0 0 2 2.5" /></svg>;
    case "ai":
      return <svg {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></svg>;
    case "signals":
      return <svg {...p}><path d="M7 3v18M7 3l-3 4M7 3l3 4" /><path d="M17 21V3M17 21l-3-4M17 21l3-4" /></svg>;
    case "rankings":
      return <svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.1" /><circle cx="4.5" cy="12" r="1.1" /><circle cx="4.5" cy="18" r="1.1" /></svg>;
    case "tips":
      return <svg {...p}><path d="M9 18h6M10 21h4" /><path d="M15 14c.2-1 .8-1.7 1.5-2.4A5 5 0 1 0 7.5 11.6c.7.7 1.3 1.4 1.5 2.4" /></svg>;
    case "sectors":
      return <svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /></svg>;
    case "results":
      return <svg {...p}><path d="M6 3h9l4 4v14H6Z" /><path d="M15 3v4h4" /><path d="m9 16 2.5-3 2 2 2.5-3.5" /></svg>;
    case "dividend":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M12 13.5v4M10.6 14.2h2.2a1.1 1.1 0 0 1 0 2.2h-1.5a1.1 1.1 0 0 0 0 2.2h2.3" /></svg>;
    case "find":
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6" /><path d="m20 20-3-3" /></svg>;
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
    case "star":
      return <svg {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" /></svg>;
    case "portfolio":
      return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></svg>;
    case "bell":
      return <svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9Z" /><path d="M10.5 20a1.8 1.8 0 0 0 3 0" /></svg>;
    case "premium":
      return <svg {...p}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" /></svg>;
    case "search":
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>;
    case "chevron":
      return <svg {...p}><path d="m9 6 6 6-6 6" /></svg>;
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

  const isWatchlist = pathname === "/watchlist";
  const isPortfolio = pathname === "/portfolio";
  const isAlerts = pathname === "/alerts";

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  // Close the menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
            {/* Explore launcher — opens the full tile menu (desktop mega-panel) */}
            <button
              type="button"
              className="navbar-link"
              data-current={menuOpen || undefined}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <IconGrid size={16} />
              <T en="Explore" bn="মেনু" />
            </button>

            <span className="navbar-nav-divider" aria-hidden="true" />

            {/* Utility + personal cluster */}
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
            <Link
              href="/watchlist"
              className="navbar-link"
              aria-current={isWatchlist ? "page" : undefined}
              aria-label={bn ? "আমার ওয়াচলিস্ট" : "My watchlist"}
            >
              {/* The new-news dot sits on the star, not the button's corner. */}
              <span className="navbar-link-icon">
                <IconStar size={16} />
                <WatchlistDot />
              </span>
              <T en="Watchlist" bn="ওয়াচলিস্ট" />
            </Link>
            <Link
              href="/portfolio"
              className="navbar-link"
              aria-current={isPortfolio ? "page" : undefined}
            >
              <IconBriefcase size={16} />
              <T en="Portfolio" bn="পোর্টফোলিও" />
            </Link>
            {/* Price Alerts + Install app moved into the Explore drawer's "Quick access"
                row (2026-09-22) — the bar carries five items, not eight. */}
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
                  {(user?.display_name ?? "U")[0].toUpperCase()}
                  {/* Members see their membership on every page. */}
                  {premium && (
                    <span className="navbar-premium-badge" aria-hidden="true">
                      <IconCrown size={10} />
                    </span>
                  )}
                </span>
                <span className="navbar-profile-name">
                  {user?.display_name ?? <T en="Profile" bn="প্রোফাইল" />}
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="navbar-link"
                  aria-current={pathname === "/login" ? "page" : undefined}
                >
                  <T en="Sign in" bn="সাইন ইন" />
                </Link>
                <Link href="/register" className="navbar-signup-btn">
                  <T en="Sign up" bn="অ্যাকাউন্ট খুলুন" />
                </Link>
              </>
            )}
            <LangSwitch className="ml-2" />
          </nav>

          {/* Mobile right controls — hidden on desktop via CSS */}
          <div className="navbar-mobile-controls">
            <LangSwitch />
            <button
              type="button"
              onClick={openGlobalSearch}
              className="navbar-search-mobile-btn"
              aria-label={bn ? "শেয়ার খুঁজুন" : "Search stocks"}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className="navbar-hamburger"
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

      {/* Full menu — mobile: full-screen sheet · desktop: centered mega-panel */}
      <div
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label={bn ? "মেনু" : "Menu"}
        onClick={(e) => {
          // Backdrop click (desktop mega-panel) closes; panel clicks don't.
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <div className="mobile-menu-panel">
        <div className="mobile-menu-header">
          <Link
            href="/"
            className="mobile-menu-brand"
            onClick={() => setMenuOpen(false)}
            aria-label={bn ? "TopStockBD — হোম" : "TopStockBD — Home"}
          >
            <span>TopStock<b>BD</b></span>
          </Link>
          {/* Desktop panel shows "Menu" instead of the brand (the launcher button already says Explore) */}
          <span className="mobile-menu-title" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <T en="Menu" bn="মেনু" />
          </span>
          <button
            className="mobile-menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label={bn ? "মেনু বন্ধ করুন" : "Close menu"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="mobile-menu-body">
          {/* Search — top priority, opens global search */}
          <button
            type="button"
            className="mobile-menu-search"
            onClick={() => {
              setMenuOpen(false);
              openGlobalSearch();
            }}
          >
            <MenuIcon name="search" />
            <span>
              <T en="Search any stock or company…" bn="যেকোনো শেয়ার বা কোম্পানি খুঁজুন…" />
            </span>
          </button>

          {/* Account */}
          {isLoggedIn ? (
            <Link
              href="/profile"
              className="mobile-menu-account"
              onClick={() => setMenuOpen(false)}
            >
              <span className="mobile-menu-account-avatar" aria-hidden="true">
                {(user?.display_name ?? "U")[0].toUpperCase()}
              </span>
              <span className="mobile-menu-account-text">
                <span className="mobile-menu-account-name">
                  {user?.display_name ?? <T en="My profile" bn="আমার প্রোফাইল" />}
                </span>
                <span className="mobile-menu-account-sub">
                  {premium ? (
                    <T en="Premium · profile and settings" bn="প্রিমিয়াম · প্রোফাইল ও সেটিংস" />
                  ) : (
                    <T en="Your profile and settings" bn="আপনার প্রোফাইল ও সেটিংস" />
                  )}
                </span>
              </span>
              <MenuIcon name="chevron" />
            </Link>
          ) : (
            <div className="mobile-menu-auth">
              <Link
                href="/login"
                className="mobile-menu-auth-btn ghost"
                onClick={() => setMenuOpen(false)}
              >
                <T en="Sign in" bn="সাইন ইন" />
              </Link>
              <Link
                href="/register"
                className="mobile-menu-auth-btn solid"
                onClick={() => setMenuOpen(false)}
              >
                <T en="Sign up" bn="অ্যাকাউন্ট খুলুন" />
              </Link>
            </div>
          )}

          {/* Quick access — the personal, frequently-used shortcuts */}
          <section className="mobile-menu-section">
            <span className="mobile-menu-section-label">
              <T en="Quick access" bn="দ্রুত যান" />
            </span>
            <div className="mobile-menu-quick">
              <Link
                href="/watchlist"
                className={`mobile-menu-quick-item${isWatchlist ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-menu-quick-icon relative">
                  <MenuIcon name="star" />
                  <WatchlistDot />
                </span>
                <T en="Watchlist" bn="ওয়াচলিস্ট" />
              </Link>
              <Link
                href="/portfolio"
                className={`mobile-menu-quick-item${isPortfolio ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-menu-quick-icon">
                  <MenuIcon name="portfolio" />
                </span>
                <T en="Portfolio" bn="পোর্টফোলিও" />
              </Link>
              <Link
                href="/alerts"
                className={`mobile-menu-quick-item${isAlerts ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-menu-quick-icon">
                  <MenuIcon name="bell" />
                </span>
                <T en="Price alerts" bn="প্রাইস অ্যালার্ট" />
              </Link>
              <Link
                href="/premium"
                className={`mobile-menu-quick-item${pathname === "/premium" ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-menu-quick-icon">
                  <MenuIcon name="premium" />
                </span>
                <T en="Premium" bn="প্রিমিয়াম" />
              </Link>
              <InstallAppButton
                className="mobile-menu-quick-item"
                label={bn ? "অ্যাপ ইনস্টল করুন" : "Install app"}
                onClick={() => setMenuOpen(false)}
              />
            </div>
          </section>

          {/* Markets · Find stocks · Learn — the whole global IA */}
          <div className="mobile-menu-groups">
            {NAV_GROUPS.map((g) => (
              <section className="mobile-menu-section" data-accent={g.accent} key={g.id}>
                <span className="mobile-menu-section-label">
                  <T en={g.label} bn={g.labelBn} />
                </span>
                <div className="mobile-menu-grid">
                  {g.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`mobile-menu-tile${isItemActive(it.href) ? " active" : ""}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="mobile-menu-tile-icon">
                        <MenuIcon name={it.icon} />
                      </span>
                      <span className="mobile-menu-tile-text">
                        <span className="mobile-menu-tile-label">
                          <T en={it.label} bn={it.labelBn} />
                        </span>
                        {it.sub && (
                          <span className="mobile-menu-tile-sub">
                            <T en={it.sub} bn={it.subBn ?? it.sub} />
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
