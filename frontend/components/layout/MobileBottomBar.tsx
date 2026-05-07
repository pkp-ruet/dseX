"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";

export default function MobileBottomBar() {
  const pathname = usePathname();
  const [watchCount, setWatchCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => setWatchCount(getWatchlist().length);
    update();
    return subscribeWatchlist(update);
  }, []);

  const items = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      badge: null as number | null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      href: "/dsestockranking",
      label: "Rankings",
      active: pathname === "/dsestockranking",
      badge: null as number | null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 14l5-5 5 5H7z" />
          <path d="M3 3h18v2H3zm0 16h18v2H3zm0-8h18v2H3z" />
        </svg>
      ),
    },
    {
      href: "/watchlist",
      label: "Watchlist",
      active: pathname === "/watchlist",
      badge: mounted && watchCount > 0 ? watchCount : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ),
    },
    {
      href: "/market-analysis",
      label: "Market",
      active: pathname === "/market-analysis",
      badge: null as number | null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
        </svg>
      ),
    },
    {
      href: "/stock-insights",
      label: "Insights",
      active: pathname === "/stock-insights" || pathname.startsWith("/stock-insights/"),
      badge: null as number | null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`mobile-bottom-bar-item${item.active ? " active" : ""}`}
        >
          <span className="mobile-bottom-bar-icon">
            {item.icon}
            {item.badge !== null && (
              <span className="mobile-bottom-bar-badge">{item.badge}</span>
            )}
          </span>
          <span className="mobile-bottom-bar-label">{item.label}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={openGlobalSearch}
        className="mobile-bottom-bar-item mobile-bottom-bar-search"
        aria-label="Search stocks"
      >
        <span className="mobile-bottom-bar-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="mobile-bottom-bar-label">Search</span>
      </button>
    </nav>
  );
}
