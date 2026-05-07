"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const isRanking = pathname === "/dsestockranking";

  const isAnalysis = pathname === "/market-analysis";
  const isWatchlist = pathname === "/watchlist";
  const isAbout = pathname === "/about";
  const isLearn = pathname === "/learn" || pathname.startsWith("/learn/");
  const isStockLists = pathname === "/stock-insights" || pathname.startsWith("/stock-insights/");
  const isStocks = pathname === "/stocks";
  const isPortfolio = pathname === "/portfolio";
  const isToday = pathname === "/dse-today";
  const isPopular = pathname === "/dse-popular-stocks";
  const isTop20 = pathname === "/dse-top-20";

  const { user, isLoggedIn } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] shadow-sm">
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
            <Link
              href="/watchlist"
              className={`navbar-watch-btn${isWatchlist ? " navbar-watch-btn-active" : ""}`}
              aria-label="My Watchlist"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="navbar-watch-label">Watchlist</span>
            </Link>
            <Link
              href="/dsestockranking"
              className={`navbar-rank-btn${isRanking ? " navbar-rank-btn-active" : ""}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 20h16v-2H4v2zm2-4h3V9H6v7zm5 0h3V5h-3v11zm5 0h3v-7h-3v7z" />
              </svg>
              Rankings
            </Link>
            <Link
              href="/dse-top-20"
              className={`navbar-intel-btn${isTop20 ? " navbar-intel-btn-active" : ""}`}
            >
              Top 20
            </Link>
            <Link
              href="/dse-popular-stocks"
              className={`navbar-intel-btn${isPopular ? " navbar-intel-btn-active" : ""}`}
            >
              Popular
            </Link>
            <Link
              href="/market-analysis"
              className={`navbar-intel-btn${isAnalysis ? " navbar-intel-btn-active" : ""}`}
            >
              Market Analysis
            </Link>
            <Link
              href="/dse-today"
              className={`navbar-intel-btn${isToday ? " navbar-intel-btn-active" : ""}`}
            >
              DSE Today
            </Link>
            <Link
              href="/stocks"
              className={`navbar-intel-btn${isStocks ? " navbar-intel-btn-active" : ""}`}
            >
              Browse Stocks
            </Link>
            <Link
              href="/stock-insights"
              className={`navbar-intel-btn${isStockLists ? " navbar-intel-btn-active" : ""}`}
            >
              Stock Insights
            </Link>
            <Link
              href="/learn"
              className={`navbar-intel-btn${isLearn ? " navbar-intel-btn-active" : ""}`}
            >
              Blogs
            </Link>
            <Link
              href="/about"
              className={`navbar-intel-btn${isAbout ? " navbar-intel-btn-active" : ""}`}
            >
              About
            </Link>
            <Link
              href="/portfolio"
              className={`navbar-intel-btn${isPortfolio ? " navbar-intel-btn-active" : ""}`}
            >
              Portfolio
            </Link>
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
            <Link
              href="/portfolio"
              className={`navbar-portfolio-mobile-btn${isPortfolio ? " navbar-portfolio-mobile-btn-active" : ""}`}
              aria-label={isLoggedIn ? "My Portfolio" : "Portfolio"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-8-2h4v2h-4V5zm8 14H4V9h16v10z" />
              </svg>
              <span>{isLoggedIn ? "My Portfolio" : "Portfolio"}</span>
            </Link>
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

      {/* Slide-in drawer */}
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
          <Link
            href="/market-analysis"
            className={`navbar-drawer-link${isAnalysis ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Market Analysis
          </Link>
          <Link
            href="/dse-today"
            className={`navbar-drawer-link${isToday ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            DSE Today
          </Link>
          <Link
            href="/stocks"
            className={`navbar-drawer-link${isStocks ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Browse Stocks
          </Link>
          <Link
            href="/stock-insights"
            className={`navbar-drawer-link${isStockLists ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Stock Insights
          </Link>
          <Link
            href="/dsestockranking"
            className={`navbar-drawer-link${isRanking ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Rankings
          </Link>
          <Link
            href="/dse-top-20"
            className={`navbar-drawer-link${isTop20 ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Top 20
          </Link>
          <Link
            href="/dse-popular-stocks"
            className={`navbar-drawer-link${isPopular ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Popular
          </Link>
          <Link
            href="/learn"
            className={`navbar-drawer-link${isLearn ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Blogs
          </Link>
          <Link
            href="/about"
            className={`navbar-drawer-link${isAbout ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Behind the Score
          </Link>
          <Link
            href="/portfolio"
            className={`navbar-drawer-link${isPortfolio ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Portfolio
          </Link>
          {isLoggedIn ? (
            <>
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
            </>
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
        </nav>
      </div>
    </>
  );
}
