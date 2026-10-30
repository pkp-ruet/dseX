"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getInsightScores } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

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
  labelBn: string;
  sub: string;
  subBn: string;
  keys: string[];
}

const PAGES: PageShortcut[] = [
  {
    href: "/market-analysis",
    label: "Market analysis",
    labelBn: "বাজার বিশ্লেষণ",
    sub: "Is the market up or down, cheap or expensive?",
    subBn: "বাজার উঠছে না নামছে, দাম কম না বেশি",
    keys: ["market", "analysis", "mood", "up or down", "cheap", "expensive", "bazar", "বাজার", "বিশ্লেষণ"],
  },
  {
    href: "/dse-today",
    label: "DSE today",
    labelBn: "আজকের DSE",
    sub: "Today's prices, biggest moves and news",
    subBn: "আজকের দাম, বড় ওঠানামা আর খবর",
    keys: ["today", "dsex", "index", "movers", "gainers", "losers", "আজ", "আজকের"],
  },
  {
    href: "/share-bazar",
    label: "Today's market in Bangla",
    labelBn: "আজকের শেয়ার বাজার",
    sub: "A short daily report in Bengali",
    subBn: "প্রতিদিনের সংক্ষিপ্ত বাজার প্রতিবেদন",
    keys: ["bangla", "bengali", "share bazar", "bazar", "শেয়ার বাজার", "আজকের", "বাংলা"],
  },
  {
    href: "/dividend-calendar",
    label: "Dividend calendar",
    labelBn: "ডিভিডেন্ড ক্যালেন্ডার",
    sub: "Record dates, AGMs and cash dividends",
    subBn: "রেকর্ড ডেট, এজিএম আর নগদ ডিভিডেন্ড",
    keys: ["dividend", "record date", "agm", "cash", "calendar", "ডিভিডেন্ড", "রেকর্ড ডেট"],
  },
  {
    href: "/dsestockranking",
    label: "Company ranking",
    labelBn: "কোম্পানির র‍্যাঙ্কিং",
    sub: "The strongest companies on the DSE",
    subBn: "ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি",
    keys: ["ranking", "rank", "best stocks", "top stocks", "strongest", "score", "র‍্যাঙ্কিং", "স্কোর"],
  },
  {
    href: "/screener",
    label: "Stock screener",
    labelBn: "স্টক স্ক্রিনার",
    sub: "Find stocks by dividend, price, profit or sector",
    subBn: "ডিভিডেন্ড, দাম, মুনাফা বা সেক্টর দিয়ে শেয়ার খুঁজুন",
    keys: ["screener", "screen", "filter", "find", "cheap", "low pe", "dividend", "high dividend", "safe",
      "beginner", "growing", "বাছাই", "স্ক্রিনার", "খুঁজুন", "সস্তা", "লভ্যাংশ"],
  },
  {
    href: "/sectors",
    label: "Sectors",
    labelBn: "সেক্টর",
    sub: "Compare whole industries",
    subBn: "পুরো সেক্টর মিলিয়ে দেখুন",
    keys: ["sector", "industry", "industries", "সেক্টর"],
  },
  {
    href: "/dse-trending-stocks",
    label: "Trending stocks",
    labelBn: "আলোচিত শেয়ার",
    sub: "This week's biggest movers",
    subBn: "এ সপ্তাহে যেগুলোর দাম সবচেয়ে বেশি নড়েছে",
    keys: ["trending", "hot", "momentum", "আলোচিত"],
  },
  {
    href: "/stock-insights",
    label: "Stock lists",
    labelBn: "শেয়ারের তালিকা",
    sub: "Dividends, big companies and more",
    subBn: "ডিভিডেন্ড, বড় কোম্পানি আর আরও তালিকা",
    keys: ["list", "lists", "insights", "তালিকা"],
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    labelBn: "ওয়াচলিস্ট",
    sub: "Stocks you follow",
    subBn: "আপনি যেগুলো নজরে রাখছেন",
    keys: ["watchlist", "watch", "follow", "ওয়াচলিস্ট"],
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    labelBn: "পোর্টফোলিও",
    sub: "The shares you own",
    subBn: "আপনার কেনা শেয়ার",
    keys: ["portfolio", "holdings", "my stocks", "পোর্টফোলিও"],
  },
];

const MAX_PAGES = 3;

function pageMatches(q: string): PageShortcut[] {
  const lower = q.trim().toLowerCase();
  if (lower.length < 2) return [];
  return PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(lower) ||
      p.labelBn.includes(lower) ||
      p.keys.some((k) => k.includes(lower) || (k.length >= 3 && lower.includes(k))),
  ).slice(0, MAX_PAGES);
}

type Item =
  | { kind: "page"; href: string; label: string; labelBn: string; sub: string; subBn: string }
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
  const { bn } = useLang();
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

  // Lazy-fetch companies on first open — once per open. Without the guard a
  // failed or empty fetch flipped `loading` back and re-fired the effect in a
  // loop, re-requesting the whole scores payload every second or two.
  const fetchTriedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      fetchTriedRef.current = false;
      return;
    }
    if (companies.length > 0 || loading || fetchTriedRef.current) return;
    fetchTriedRef.current = true;
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
    const pages = pageMatches(query).map<Item>((p) => ({
      kind: "page",
      href: p.href,
      label: p.label,
      labelBn: p.labelBn,
      sub: p.sub,
      subBn: p.subBn,
    }));
    const stocks = getSuggestions(query).map<Item>((c) => ({ kind: "stock", code: c.trading_code, name: c.company_name }));
    return [...pages, ...stocks];
  }, [query, getSuggestions]);

  const go = useCallback(
    (item: Item) => {
      const href = item.kind === "page" ? item.href : `/stock/${item.code.toUpperCase()}`;
      setNavLabel(item.kind === "page" ? (bn ? item.labelBn : item.label) : item.code.toUpperCase());
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
              {bn ? (
                <>
                  <span className="nav-loading-code">{navLabel}</span> খোলা হচ্ছে…
                </>
              ) : (
                <>
                  Opening <span className="nav-loading-code">{navLabel}</span>…
                </>
              )}
            </div>
            <div className="nav-loading-sub">
              <T en="Loading the latest data" bn="সর্বশেষ তথ্য আনা হচ্ছে" />
            </div>
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
      aria-label={bn ? "শেয়ার আর পেজ খুঁজুন" : "Search stocks and pages"}
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
            placeholder={bn ? "শেয়ার বা কোম্পানি খুঁজুন…" : "Search a stock or company…"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-label={bn ? "কোম্পানি আর পেজ খুঁজুন" : "Search companies and pages"}
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
            aria-label={bn ? "খোঁজা বন্ধ করুন" : "Close search"}
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
                    <span className="search-suggestion-code">
                      <T en={it.label} bn={it.labelBn} />
                    </span>
                    <span className="search-suggestion-name">
                      <T en={it.sub} bn={it.subBn} />
                    </span>
                    <span className="search-suggestion-tag">
                      <T en="Page" bn="পেজ" />
                    </span>
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
            {loading ? (
              <T en="Loading companies…" bn="কোম্পানির তালিকা আনা হচ্ছে…" />
            ) : (
              <T
                en="Nothing matches yet. Press Enter to open this code."
                bn="কিছু মেলেনি। এই কোডটি খুলতে Enter চাপুন।"
              />
            )}
          </div>
        ) : (
          <div className="global-search-hint">
            <T
              en={
                <>
                  Type a code (for example <strong>GP</strong> or <strong>BATBC</strong>), a company name, or a
                  page such as <strong>market</strong> or <strong>dividend</strong>.
                </>
              }
              bn={
                <>
                  কোড (যেমন <strong>GP</strong> বা <strong>BATBC</strong>), কোম্পানির নাম, অথবা{" "}
                  <strong>বাজার</strong> বা <strong>ডিভিডেন্ড</strong>-এর মতো পেজের নাম লিখুন।
                </>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
