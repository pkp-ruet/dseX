"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const isRanking = pathname === "/dsestockranking";
  const isIntel = pathname === "/market-intelligence";
  const isWatchlist = pathname === "/watchlist";
  const isAbout = pathname === "/about";
  const isLearn = pathname === "/learn" || pathname.startsWith("/learn/");
  const isStockLists = pathname === "/stock-lists" || pathname.startsWith("/stock-lists/");
  const isLiveMarket = pathname === "/live-market";
  const isStocks = pathname === "/stocks";

  const [watchCount, setWatchCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => setWatchCount(getWatchlist().length);
    update();
    return subscribeWatchlist(update);
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
      <header className="fixed top-1 left-0 right-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
            <svg className="navbar-brand-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10,1.5 L17.37,5.75 L17.37,14.25 L10,18.5 L2.63,14.25 L2.63,5.75 Z M10,4 L15.2,7 L15.2,13 L10,16 L4.8,13 L4.8,7 Z" />
              <path fillRule="evenodd" d="M10,5 L14.33,7.5 L14.33,12.5 L10,15 L5.67,12.5 L5.67,7.5 Z M10,6.5 L13.03,8.25 L13.03,11.75 L10,13.5 L6.97,11.75 L6.97,8.25 Z" />
              <polygon points="10,8 11.73,9 11.73,11 10,12 8.27,11 8.27,9" />
            </svg>
            <span className="navbar-brand-dse">topstock</span>
            <span className="navbar-brand-score">bd</span>
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
              {mounted && watchCount > 0 && (
                <span className="navbar-watch-badge">{watchCount}</span>
              )}
            </Link>
            <Link
              href="/dsestockranking"
              className={`navbar-rank-btn${isRanking ? " navbar-rank-btn-active" : ""}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
              Rankings
            </Link>
            <Link
              href="/stocks"
              className={`navbar-intel-btn${isStocks ? " navbar-intel-btn-active" : ""}`}
            >
              All Stocks
            </Link>
            <Link
              href="/stock-lists"
              className={`navbar-intel-btn${isStockLists ? " navbar-intel-btn-active" : ""}`}
            >
              Top Stocks
            </Link>
            <Link
              href="/live-market"
              className={`navbar-intel-btn${isLiveMarket ? " navbar-intel-btn-active" : ""}`}
            >
              Live Market
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
            <ThemeToggle />
          </nav>

          {/* Mobile right controls — hidden on desktop via CSS */}
          <div className="navbar-mobile-controls">
            <ThemeToggle />
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
            href="/watchlist"
            className={`navbar-drawer-link${isWatchlist ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Watchlist
            {mounted && watchCount > 0 && (
              <span className="navbar-watch-badge">{watchCount}</span>
            )}
          </Link>
          <Link
            href="/stocks"
            className={`navbar-drawer-link${isStocks ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
            All Stocks
          </Link>
          <Link
            href="/stock-lists"
            className={`navbar-drawer-link${isStockLists ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
            Top Stocks
          </Link>
          <Link
            href="/live-market"
            className={`navbar-drawer-link${isLiveMarket ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/>
            </svg>
            Live Market
          </Link>
          <Link
            href="/dsestockranking"
            className={`navbar-drawer-link${isRanking ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" />
            </svg>
            Rankings
          </Link>
          <Link
            href="/learn"
            className={`navbar-drawer-link${isLearn ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
            Blogs
          </Link>
          <Link
            href="/about"
            className={`navbar-drawer-link${isAbout ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            Behind the Score
          </Link>
        </nav>
      </div>
    </>
  );
}
