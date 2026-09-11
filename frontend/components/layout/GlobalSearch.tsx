"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getInsightScores } from "@/lib/api";

interface Company {
  trading_code: string;
  company_name: string | null;
}

/**
 * Page shortcuts — so typing "market" or "dividend" finds the page, not just
 * a stock whose name happens to contain the word. Matched on the label and
 * on plain keywords a reader might type (English + a few Bengali), shown above
 * the stock matches, at most three.
 */
interface PageShortcut {
  href: string;
  label: string;
  sub: string;
  keys: string[];
}

const PAGES: PageShortcut[] = [
  {
    href: "/market-analysis",
    label: "Market Analysis",
    sub: "Is the market up or down, cheap or pricey?",
    keys: ["market", "analysis", "mood", "up or down", "cheap", "expensive", "bazar", "বাজার"],
  },
  {
    href: "/dse-today",
    label: "DSE Today",
    sub: "Today's prices, movers and news",
    keys: ["today", "dsex", "index", "movers", "gainers", "losers", "আজ"],
  },
  {
    href: "/dividend-calendar",
    label: "Dividend Calendar",
    sub: "Record dates, AGMs and cash payouts",
    keys: ["dividend", "record date", "agm", "cash", "calendar", "ডিভিডেন্ড"],
  },
  {
    href: "/dsestockranking",
    label: "Stock Rankings",
    sub: "Every company scored, best first",
    keys: ["ranking", "rank", "best stocks", "top stocks", "score"],
  },
  {
    href: "/sectors",
    label: "Sectors",
    sub: "Compare whole industries",
    keys: ["sector", "industry", "industries"],
  },
  {
    href: "/dse-trending-stocks",
    label: "Trending Stocks",
    sub: "This week's top movers",
    keys: ["trending", "hot", "momentum"],
  },
  {
    href: "/stock-insights",
    label: "Ready-made lists",
    sub: "Dividends, growth, big companies and more",
    keys: ["list", "lists", "insights"],
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    sub: "Stocks you follow",
    keys: ["watchlist", "watch", "follow"],
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    sub: "Your holdings",
    keys: ["portfolio", "holdings", "my stocks"],
  },
];

const MAX_PAGES = 3;

function pageMatches(q: string): PageShortcut[] {
  const lower = q.trim().toLowerCase();
  if (lower.length < 2) return [];
  return PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(lower) ||
      p.keys.some((k) => k.includes(lower) || (k.length >= 3 && lower.includes(k))),
  ).slice(0, MAX_PAGES);
}

type Item =
  | { kind: "page"; href: string; label: string; sub: string }
  | { kind: "stock"; code: string; name: string | null };

const OPEN_EVENT = "dsex:open-search";

export function openGlobalSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [navLabel, setNavLabel] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for global open event
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Keyboard: "/" (when not typing) or Ctrl/Cmd+K opens the search anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!isK && !isSlash) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (isSlash && typing) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy-fetch companies on first open
  useEffect(() => {
    if (!open || companies.length > 0 || loading) return;
    setLoading(true);
    getInsightScores()
      .then((items) => {
        setCompanies(
          items.map((c) => ({
            trading_code: c.trading_code,
            company_name: c.company_name,
          }))
        );
      })
      .catch(() => {
        /* silent — search by code still works */
      })
      .finally(() => setLoading(false));
  }, [open, companies.length, loading]);

  // Auto-focus on open & lock body scroll
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const getSuggestions = useCallback(
    (q: string): Company[] => {
      if (q.length < 1) return [];
      const lower = q.toLowerCase();
      return companies
        .filter(
          (c) =>
            c.trading_code.toLowerCase().includes(lower) ||
            (c.company_name && c.company_name.toLowerCase().includes(lower))
        )
        .slice(0, 10);
    },
    [companies]
  );

  // Pages first, then stocks — one flat list so arrow keys walk both.
  const items = useMemo<Item[]>(() => {
    const pages = pageMatches(query).map<Item>((p) => ({ kind: "page", href: p.href, label: p.label, sub: p.sub }));
    const stocks = getSuggestions(query).map<Item>((c) => ({ kind: "stock", code: c.trading_code, name: c.company_name }));
    return [...pages, ...stocks];
  }, [query, getSuggestions]);

  const go = useCallback(
    (item: Item) => {
      const href = item.kind === "page" ? item.href : `/stock/${item.code.toUpperCase()}`;
      setNavLabel(item.kind === "page" ? item.label : item.code.toUpperCase());
      // Keep the overlay up and show a loading state instead of freezing on
      // the current view; isPending stays true until the destination is ready.
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  // Once the navigation settles, dismiss the search modal.
  useEffect(() => {
    if (!pending && navLabel) {
      close();
      setNavLabel(null);
    }
  }, [pending, navLabel, close]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        go(items[activeIndex]);
      } else if (items.length > 0) {
        go(items[0]);
      } else if (query.trim()) {
        go({ kind: "stock", code: query.trim().toUpperCase(), name: null });
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  // While the destination loads, replace the search panel with a loading card
  // so the user gets instant feedback instead of a frozen screen.
  if (pending && navLabel) {
    return (
      <div className="global-search-overlay" role="status" aria-live="polite">
        <div className="global-search-panel">
          <div className="nav-loading-card nav-loading-card--panel">
            <div className="nav-loading-spinner" aria-hidden="true" />
            <div className="nav-loading-label">
              Opening <span className="nav-loading-code">{navLabel}</span>…
            </div>
            <div className="nav-loading-sub">Loading the latest data</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="global-search-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search stocks and pages"
    >
      <div className="global-search-panel">
        <div className="search-bar-box search-bar-open">
          <svg className="search-bar-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="search-bar-input"
            type="text"
            placeholder="Search a code, a company, or a page…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-label="Search companies and pages"
            aria-autocomplete="list"
            aria-expanded={items.length > 0}
            aria-controls="global-search-listbox"
            aria-activedescendant={
              activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined
            }
          />
          <button
            className="global-search-close"
            onClick={close}
            aria-label="Close search"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {items.length > 0 ? (
          <ul
            id="global-search-listbox"
            className="search-suggestions global-search-suggestions"
            role="listbox"
          >
            {items.map((it, i) => (
              <li
                key={it.kind === "page" ? it.href : it.code}
                id={`global-search-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`search-suggestion-item${
                  i === activeIndex ? " search-suggestion-active" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(it);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {it.kind === "page" ? (
                  <>
                    <span className="search-suggestion-code">{it.label}</span>
                    <span className="search-suggestion-name">{it.sub}</span>
                    <span className="search-suggestion-tag">Page</span>
                  </>
                ) : (
                  <>
                    <span className="search-suggestion-code">{it.code}</span>
                    {it.name && <span className="search-suggestion-name">{it.name}</span>}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : query.length > 0 ? (
          <div className="global-search-empty">
            {loading ? "Loading companies…" : "No matches. Press Enter to open this code."}
          </div>
        ) : (
          <div className="global-search-hint">
            Type a code (e.g. <strong>GP</strong>, <strong>BATBC</strong>), a company name, or a page
            like <strong>market</strong> or <strong>dividend</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
