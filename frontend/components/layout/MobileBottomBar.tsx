"use client";
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import WatchlistDot from "@/components/watchlist/WatchlistDot";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { placeByKey, placeOf, type PlaceKey } from "@/lib/places";

/**
 * FIVE tabs = the map (2026-11-20, lib/places.ts): Home · Market · Search ·
 * Lists · My shares (Find became Lists 2026-11-25). Each place tab opens its
 * place's page (/market, /lists, /my) and stays lit on every page inside it.
 * Learn, Premium and the account live in the navbar's menu. The Explore tab
 * (which opened a 20-row menu) is gone; never add a sixth tab.
 */

const HomeIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const MarketIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
);
const ListsIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" />
  </svg>
);
const MineIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 4a2 2 0 0 0-2 2v1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3V6a2 2 0 0 0-2-2H9zm0 2h6v1H9V6z" />
  </svg>
);

const ICONS: Record<Exclude<PlaceKey, "learn">, React.ReactNode> = {
  market: MarketIcon,
  lists: ListsIcon,
  mine: MineIcon,
};

export default function MobileBottomBar() {
  const pathname = usePathname();
  const { bn } = useLang();
  const here = placeOf(pathname)?.place.key;

  const tab = (key: Exclude<PlaceKey, "learn">) => {
    const place = placeByKey(key);
    return (
      <Link
        key={key}
        href={place.href}
        className={`mobile-bottom-bar-item${here === key ? " active" : ""}`}
        aria-current={here === key ? "page" : undefined}
      >
        <span className="mobile-bottom-bar-icon">
          <span className="mobile-bottom-bar-glyph">
            {ICONS[key]}
            {key === "mine" && <WatchlistDot />}
          </span>
        </span>
        <span className="mobile-bottom-bar-label">
          <T en={place.name.en} bn={place.name.bn} />
        </span>
      </Link>
    );
  };

  return (
    <nav className="mobile-bottom-bar" aria-label={bn ? "নিচের মেনু" : "Mobile navigation"}>
      <Link
        href="/"
        className={`mobile-bottom-bar-item${pathname === "/" ? " active" : ""}`}
        aria-current={pathname === "/" ? "page" : undefined}
      >
        <span className="mobile-bottom-bar-icon">
          <span className="mobile-bottom-bar-glyph">{HomeIcon}</span>
        </span>
        <span className="mobile-bottom-bar-label">
          <T en="Home" bn="হোম" />
        </span>
      </Link>

      {tab("market")}

      {/* Accented primary action — search any stock or page */}
      <button
        type="button"
        onClick={openGlobalSearch}
        className="mobile-bottom-bar-item mobile-bottom-bar-search"
        aria-label={bn ? "শেয়ার খুঁজুন" : "Search stocks"}
      >
        <span className="mobile-bottom-bar-search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
        <span className="mobile-bottom-bar-label">
          <T en="Search" bn="খুঁজুন" />
        </span>
      </button>

      {tab("lists")}
      {tab("mine")}
    </nav>
  );
}
