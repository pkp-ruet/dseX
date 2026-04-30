"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const isRanking = pathname === "/dsestockranking";
  const isIntel = pathname === "/market-intelligence";
  const isWatchlist = pathname === "/watchlist";
  const isAbout = pathname === "/about";
  const isLearn = pathname === "/learn" || pathname.startsWith("/learn/");
  const isStockLists = pathname === "/stock-insights" || pathname.startsWith("/stock-insights/");
  const isStocks = pathname === "/stocks";
  const isPortfolio = pathname === "/portfolio";

  const { user, isLoggedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <Link href="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
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
              href="/market-intelligence"
              className={`navbar-intel-btn${isIntel ? " navbar-intel-btn-active" : ""}`}
            >
              Market Signal
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
            {mounted && (
              isLoggedIn ? (
                <Link
                  href="/profile"
                  className={`navbar-intel-btn${pathname === "/profile" ? " navbar-intel-btn-active" : ""}`}
                >
                  {user?.display_name ?? "Profile"}
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
              )
            )}
          </nav>

          {/* Mobile right controls — hidden on desktop via CSS */}
          <div className="navbar-mobile-controls">
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
            href="/market-intelligence"
            className={`navbar-drawer-link${isIntel ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            Market Signal
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
          {mounted && (
            isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  className={`navbar-drawer-link${pathname === "/profile" ? " active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
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
            )
          )}
        </nav>
      </div>
    </>
  );
}
