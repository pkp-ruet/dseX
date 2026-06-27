"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

type NavItem = { href: string; label: string; sub?: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "markets",
    label: "Markets",
    items: [
      { href: "/dse-today", label: "DSE Today", sub: "Today's prices & movers" },
      { href: "/market-analysis", label: "Market Analysis", sub: "Pulse, sentiment, trends" },
      { href: "/dse-top-20", label: "DSE Top 20", sub: "Momentum leaders" },
      { href: "/dse-popular-stocks", label: "Popular Stocks", sub: "Most-traded today" },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    items: [
      { href: "/dsestockranking", label: "Rankings", sub: "Scored leaderboard" },
      { href: "/daily-tips", label: "Daily Tips", sub: "Fresh signals every day" },
      { href: "/stock-recommendation", label: "Find My Stocks", sub: "Personalized picker" },
      { href: "/stock-insights", label: "Stock Picks", sub: "Curated lists" },
      { href: "/stocks", label: "Browse All Stocks", sub: "Full A–Z table" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { href: "/learn", label: "Blogs", sub: "English guides" },
      { href: "/blog", label: "বাংলা ব্লগ", sub: "Bangla guides" },
      { href: "/about", label: "Behind the Score", sub: "How we rank stocks" },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const isWatchlist = pathname === "/watchlist";
  const isPortfolio = pathname === "/portfolio";

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  const isGroupActive = (g: NavGroup) => g.items.some((it) => isItemActive(it.href));

  // Close drawer + dropdowns on route change
  useEffect(() => {
    setMenuOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  // Open drawer from external trigger (bottom-bar Menu tab)
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
          <nav className="navbar-nav" ref={navRef}>
            {/* Primary: grouped dropdowns by intent */}
            {NAV_GROUPS.map((g) => {
              const open = openMenu === g.id;
              return (
                <div className="navbar-dropdown" key={g.id}>
                  <button
                    type="button"
                    className={`navbar-dropdown-trigger navbar-intel-btn${isGroupActive(g) ? " navbar-intel-btn-active" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpenMenu(open ? null : g.id)}
                  >
                    {g.label}
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" style={{ marginLeft: 4 }}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {/* Always mounted (display toggled via CSS) so crawlers see the links */}
                  <div className={`navbar-dropdown-panel navbar-dropdown-panel-left${open ? " open" : ""}`} role="menu">
                    {g.items.map((it) => (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={`navbar-dropdown-item${isItemActive(it.href) ? " navbar-intel-btn-active" : ""}`}
                        role="menuitem"
                        onClick={() => setOpenMenu(null)}
                      >
                        <span className="navbar-dropdown-item-label">{it.label}</span>
                        {it.sub && <span className="navbar-dropdown-item-sub">{it.sub}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

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

      {/* Overlay */}
      {menuOpen && (
        <div
          className="navbar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer — mirrors the desktop groups */}
      <div
        className={`navbar-drawer${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="navbar-drawer-header">
          <span className="navbar-drawer-title">Menu</span>
          <button
            className="navbar-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <nav className="navbar-drawer-nav">
          {NAV_GROUPS.map((g) => (
            <div className="navbar-drawer-group" key={g.id}>
              <span className="navbar-drawer-group-label">{g.label}</span>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`navbar-drawer-link${isItemActive(it.href) ? " active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="navbar-drawer-group">
            <span className="navbar-drawer-group-label">You</span>
            <Link
              href="/watchlist"
              className={`navbar-drawer-link${isWatchlist ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Watchlist
            </Link>
            <Link
              href="/portfolio"
              className={`navbar-drawer-link${isPortfolio ? " active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              Portfolio
            </Link>
            <InstallAppButton
              className="navbar-drawer-link"
              onClick={() => setMenuOpen(false)}
            />
            {isLoggedIn ? (
              <Link
                href="/profile"
                className={`navbar-drawer-link navbar-drawer-profile${pathname === "/profile" ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="navbar-profile-avatar">
                  {(user?.display_name ?? "U")[0].toUpperCase()}
                </span>
                {user?.display_name ?? "My Profile"}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`navbar-drawer-link${pathname === "/login" ? " active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={`navbar-drawer-link${pathname === "/register" ? " active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
