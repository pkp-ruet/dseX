"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCachedWatchlist, subscribeWatchlist, loadWatchlist } from "@/lib/watchlist";
import { isLoggedIn } from "@/lib/auth";
import { openMobileDrawer } from "@/components/layout/Navbar";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import { openExploreSheet } from "@/components/layout/ExploreSheet";

// The Explore tab stays highlighted on any of its launcher destinations.
const EXPLORE_PATHS = [
  "/dsestockranking",
  "/stocks",
  "/market-analysis",
  "/dse-today",
  "/dse-trending-stocks",
  "/dse-popular-stocks",
];
const matches = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(p + "/"));

type BarItem = {
  href: string;
  label: string;
  active: boolean;
  badge: number | null;
  icon: React.ReactNode;
};

const HomeIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const ExploreIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
    <path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2 5.2-2z" />
  </svg>
);
const WatchIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);
const PortfolioIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 4a2 2 0 0 0-2 2v1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3V6a2 2 0 0 0-2-2H9zm0 2h6v1H9V6z" />
  </svg>
);
const MenuIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
  </svg>
);

export default function MobileBottomBar() {
  const pathname = usePathname();
  const [watchCount, setWatchCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => setWatchCount(getCachedWatchlist().length);
    if (isLoggedIn()) {
      loadWatchlist().then(update);
    } else {
      update();
    }
    return subscribeWatchlist(update);
  }, []);

  const leftItems: BarItem[] = [
    { href: "/", label: "Home", active: pathname === "/", badge: null, icon: HomeIcon },
  ];

  const exploreActive = matches(pathname, EXPLORE_PATHS);

  const rightItems: BarItem[] = [
    {
      href: "/watchlist",
      label: "Watchlist",
      active: pathname === "/watchlist",
      badge: mounted && watchCount > 0 ? watchCount : null,
      icon: WatchIcon,
    },
    {
      href: "/portfolio",
      label: "Portfolio",
      active: pathname === "/portfolio" || pathname.startsWith("/portfolio/"),
      badge: null,
      icon: PortfolioIcon,
    },
  ];

  const renderItem = (item: BarItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={`mobile-bottom-bar-item${item.active ? " active" : ""}`}
    >
      <span className="mobile-bottom-bar-icon">
        <span className="mobile-bottom-bar-glyph">
          {item.icon}
          {item.badge !== null && (
            <span className="mobile-bottom-bar-badge">{item.badge}</span>
          )}
        </span>
      </span>
      <span className="mobile-bottom-bar-label">{item.label}</span>
    </Link>
  );

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile navigation">
      {leftItems.map(renderItem)}

      {/* Explore — opens the bottom-sheet launcher (Rankings, Browse, Analysis, DSE Today) */}
      <button
        type="button"
        onClick={openExploreSheet}
        className={`mobile-bottom-bar-item${exploreActive ? " active" : ""}`}
        aria-label="Explore"
        aria-haspopup="dialog"
      >
        <span className="mobile-bottom-bar-icon">
          <span className="mobile-bottom-bar-glyph">{ExploreIcon}</span>
        </span>
        <span className="mobile-bottom-bar-label">Explore</span>
      </button>

      {/* Accented primary action — search any stock */}
      <button
        type="button"
        onClick={openGlobalSearch}
        className="mobile-bottom-bar-item mobile-bottom-bar-search"
        aria-label="Search stocks"
      >
        <span className="mobile-bottom-bar-search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
        <span className="mobile-bottom-bar-label">Search</span>
      </button>

      {rightItems.map(renderItem)}

      <button
        type="button"
        onClick={openMobileDrawer}
        className="mobile-bottom-bar-item"
        aria-label="Open menu"
      >
        <span className="mobile-bottom-bar-icon">
          <span className="mobile-bottom-bar-glyph">{MenuIcon}</span>
        </span>
        <span className="mobile-bottom-bar-label">Menu</span>
      </button>
    </nav>
  );
}
