"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import WatchlistDot from "@/components/watchlist/WatchlistDot";
import InstallAppButton from "@/components/pwa/InstallAppButton";

const OPEN_DRAWER_EVENT = "dsex:open-drawer";

/** Open the mobile nav drawer from anywhere (e.g. the bottom-bar Menu tab). */
export function openMobileDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_DRAWER_EVENT));
}

type NavItem = { href: string; label: string; sub?: string; icon?: string };
type NavGroup = { id: string; label: string; accent?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "markets",
    label: "Markets",
    accent: "info",
    items: [
      { href: "/dse-today", label: "DSE Today", sub: "Today's prices & movers", icon: "today" },
      { href: "/todays-news", label: "Today's News", sub: "All company news, last day", icon: "news" },
      { href: "/market-analysis", label: "Market Analysis", sub: "Pulse, sentiment, trends", icon: "analysis" },
      { href: "/dse-top-20", label: "DSE Top 20", sub: "Momentum leaders", icon: "top20" },
      { href: "/dse-popular-stocks", label: "Popular Stocks", sub: "Most-traded today", icon: "popular" },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    accent: "clay",
    items: [
      { href: "/assistant", label: "TopStock AI", sub: "Chat: picks, market & answers", icon: "ai" },
      { href: "/buy-sell-signals", label: "Buy/Sell Signals", sub: "What to buy & sell now", icon: "signals" },
      { href: "/dsestockranking", label: "Rankings", sub: "Scored leaderboard", icon: "rankings" },
      { href: "/daily-tips", label: "Daily Tips", sub: "Fresh signals every day", icon: "tips" },
      { href: "/stock-recommendation", label: "Find My Stocks", sub: "Personalized picker", icon: "find" },
      { href: "/stock-insights", label: "Stock Lists", sub: "Ready-made lists", icon: "lists" },
      { href: "/stocks", label: "Browse All Stocks", sub: "Full A–Z table", icon: "browse" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    accent: "gold",
    items: [
      { href: "/learn", label: "Blogs", sub: "English guides", icon: "blog" },
      { href: "/blog", label: "বাংলা ব্লগ", sub: "Bangla guides", icon: "bangla" },
      { href: "/about", label: "Behind the Score", sub: "How we rank stocks", icon: "about" },
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

  // Open the menu from an external trigger (bottom-bar Menu tab)
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
            aria-label="TopStockBD — Home"
            title="Home"
          >
            <span className="navbar-brand-home" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11.5L12 4l9 7.5" />
                <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
              </svg>
            </span>
            <span className="navbar-brand-dse">TopStock</span>
            <span className="navbar-brand-score">BD</span>
          </Link>

          {/* Desktop nav — hidden on mobile via CSS */}
          <nav className="navbar-nav">
            {/* Explore launcher — opens the full tile menu (desktop mega-panel) */}
            <button
              type="button"
              className={`navbar-explore-btn${menuOpen ? " navbar-explore-btn-active" : ""}`}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              Explore
            </button>

            <span className="navbar-nav-divider" aria-hidden="true" />

            {/* Utility + personal cluster */}
            <button
              type="button"
              onClick={openGlobalSearch}
              className="navbar-search-btn"
              aria-label="Search stocks"
              title="Search (any code or company name)"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span className="navbar-search-label">Search</span>
            </button>
            <Link
              href="/watchlist"
              className={`navbar-watch-btn${isWatchlist ? " navbar-watch-btn-active" : ""} relative`}
              aria-label="My Watchlist"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="navbar-watch-label">Watchlist</span>
              <WatchlistDot />
            </Link>
            <Link
              href="/portfolio"
              className={`navbar-intel-btn${isPortfolio ? " navbar-intel-btn-active" : ""}`}
            >
              Portfolio
            </Link>
            <Link
              href="/alerts"
              className={`navbar-intel-btn${isAlerts ? " navbar-intel-btn-active" : ""}`}
            >
              Price Alerts
            </Link>
            <InstallAppButton className="navbar-intel-btn" />
            {isLoggedIn ? (
              <Link
                href="/profile"
                className={`navbar-profile-btn${pathname === "/profile" ? " navbar-profile-btn-active" : ""}`}
                aria-label="My Profile"
              >
                <span className="navbar-profile-avatar">
                  {(user?.display_name ?? "U")[0].toUpperCase()}
                </span>
                <span className="navbar-profile-name">{user?.display_name ?? "Profile"}</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="navbar-intel-btn">
                  Sign In
                </Link>
                <Link href="/register" className="navbar-rank-btn">
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile right controls — hidden on desktop via CSS */}
          <div className="navbar-mobile-controls">
            <button
              type="button"
              onClick={openGlobalSearch}
              className="navbar-search-mobile-btn"
              aria-label="Search stocks"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className="navbar-hamburger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
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
        aria-label="Menu"
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
            aria-label="TopStockBD — Home"
          >
            <span className="mobile-menu-brand-home" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11.5L12 4l9 7.5" />
                <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
              </svg>
            </span>
            <span>TopStock<b>BD</b></span>
          </Link>
          {/* Desktop mega-panel shows an "Explore" heading instead of the brand */}
          <span className="mobile-menu-title" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Explore
          </span>
          <button
            className="mobile-menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
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
            <span>Search any stock or company…</span>
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
                <span className="mobile-menu-account-name">{user?.display_name ?? "My Profile"}</span>
                <span className="mobile-menu-account-sub">View profile &amp; settings</span>
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
                Sign In
              </Link>
              <Link
                href="/register"
                className="mobile-menu-auth-btn solid"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Quick access — the personal, frequently-used shortcuts */}
          <section className="mobile-menu-section">
            <span className="mobile-menu-section-label">Quick access</span>
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
                Watchlist
              </Link>
              <Link
                href="/portfolio"
                className={`mobile-menu-quick-item${isPortfolio ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-menu-quick-icon">
                  <MenuIcon name="portfolio" />
                </span>
                Portfolio
              </Link>
              <Link
                href="/alerts"
                className={`mobile-menu-quick-item${isAlerts ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-menu-quick-icon">
                  <MenuIcon name="bell" />
                </span>
                Price Alerts
              </Link>
              <InstallAppButton
                className="mobile-menu-quick-item"
                label="Install app"
                onClick={() => setMenuOpen(false)}
              />
            </div>
          </section>

          {/* Grouped navigation — scannable tile grids (3-up columns on desktop) */}
          <div className="mobile-menu-groups">
            {NAV_GROUPS.map((g) => (
              <section className="mobile-menu-section" data-accent={g.accent} key={g.id}>
                <span className="mobile-menu-section-label">{g.label}</span>
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
                        <span className="mobile-menu-tile-label">{it.label}</span>
                        {it.sub && <span className="mobile-menu-tile-sub">{it.sub}</span>}
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
