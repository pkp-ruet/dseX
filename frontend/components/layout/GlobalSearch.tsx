"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getInsightScores } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { ALL_PAGES } from "@/lib/places";

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

/**
 * Names and lines come from the map (lib/places.ts, 2026-11-20) so a page is
 * called the same thing here as in the menu. Only the keywords live here.
 * Folded pages (trending, today's news, all stocks, price alerts) are found
 * through their owner's keywords.
 */
const PAGE_KEYS: Record<string, string[]> = {
  today: [
    "market", "today", "dse today", "analysis", "mood", "up or down", "dsex", "index", "movers", "gainers",
    "losers", "news", "notices", "trending", "hot", "popular", "share bazar", "bazar",
    "বাজার", "বিশ্লেষণ", "আজ", "আজকের", "শেয়ার বাজার", "খবর", "আলোচিত",
  ],
  results: ["result", "results", "quarter", "quarterly", "earnings", "eps", "profit", "q1", "q2", "q3", "annual",
    "ফল", "আর্থিক ফল", "প্রান্তিক", "মুনাফা"],
  calendar: ["dividend", "record date", "agm", "cash", "calendar", "dates", "board meeting", "results meeting",
    "ডিভিডেন্ড", "রেকর্ড ডেট", "ক্যালেন্ডার", "তারিখ", "এজিএম"],
  sectors: ["sector", "industry", "industries", "সেক্টর"],
  buylist: ["buy", "buy list", "buy signal", "signals", "what to buy", "best shares", "best stocks", "undervalued",
    "কেনার তালিকা", "কী কিনব", "কোন শেয়ার কিনব", "সিগন্যাল"],
  builder: ["portfolio builder", "build portfolio", "build a portfolio", "invest", "invest money", "how to invest",
    "1 lakh", "lakh", "plan", "where to invest", "বিনিয়োগ", "টাকা", "পোর্টফোলিও বানান", "কোথায় বিনিয়োগ"],
  companies: ["ranking", "rank", "top stocks", "strongest", "score", "all stocks", "all shares", "all companies",
    "share price", "prices", "price list", "a to z", "র‍্যাঙ্কিং", "স্কোর", "সব শেয়ার", "সব কোম্পানি", "শেয়ারের দাম", "শেয়ারদর"],
  screener: ["screener", "screen", "filter", "find", "cheap", "low pe", "pe", "pb", "book value",
    "high dividend", "yield", "market cap", "growing", "বাছাই", "স্ক্রিনার", "সস্তা", "লভ্যাংশ"],
  compare: ["compare", "comparison", "vs", "versus", "side by side", "which is better", "better share",
    "তুলনা", "পাশাপাশি", "কোনটা ভালো"],
  research: ["insights", "research", "report", "reports", "risk", "auditor", "qualified", "going concern",
    "results season", "owners", "গবেষণা", "ঝুঁকি", "নিরীক্ষক", "রিপোর্ট"],
  portfolio: ["portfolio", "holdings", "my stocks", "my shares", "profit", "loss", "পোর্টফোলিও", "আমার শেয়ার"],
  shares: ["my shares", "watchlist", "watch", "follow", "watch rules", "rules", "watch this share", "alert", "alerts",
    "price alert", "target", "tell me when", "আমার শেয়ার", "ওয়াচলিস্ট", "নিয়ম", "নজর", "অ্যালার্ট", "প্রাইস অ্যালার্ট"],
  updates: ["notification", "notifications", "inbox", "bell", "updates", "নোটিফিকেশন", "আপডেট"],
  foryou: ["for you", "based on", "picked", "picks", "similar", "like my shares", "discover", "explore",
    "recommend", "recommendation", "suggest", "watch next", "ideas", "আপনার জন্য", "বাছাই", "মতো শেয়ার", "পরামর্শ"],
  guides: ["learn", "guide", "guides", "beginner", "how to", "tutorial", "blog", "শিখুন", "গাইড", "নতুন"],
  about: ["about", "how we score", "method", "grade", "methodology", "পদ্ধতি", "গ্রেড", "আমাদের সম্পর্কে"],
};

const PAGES: PageShortcut[] = [
  ...ALL_PAGES.map((p) => ({
    href: p.href,
    label: p.name.en,
    labelBn: p.name.bn,
    sub: p.line.en,
    subBn: p.line.bn,
    keys: PAGE_KEYS[p.key] ?? [],
  })),
  {
    href: "/blog",
    label: "Bangla blog",
    labelBn: "বাংলা ব্লগ",
    sub: "Beginner guides in Bengali",
    subBn: "নতুনদের জন্য বাংলায় গাইড",
    keys: ["bangla", "blog", "ব্লগ", "বাংলা"],
  },
  {
    href: "/premium",
    label: "Premium",
    labelBn: "প্রিমিয়াম",
    sub: "What Premium adds, and the plans",
    subBn: "প্রিমিয়ামে কী আছে, আর প্ল্যান",
    keys: ["premium", "plan", "plans", "price", "pay", "bkash", "nagad", "subscribe", "upgrade", "প্রিমিয়াম", "প্ল্যান", "বিকাশ", "নগদ"],
  },
];

const MAX_PAGES = 3;

function pageMatches(q: string): PageShortcut[] {
  const lower = q.trim().toLowerCase();
  if (lower.length < 2) return [];
  return PAGES.filter(
    (p) =>
      (lower.length >= 3 ? p.label.toLowerCase().includes(lower) : p.label.toLowerCase().startsWith(lower)) ||
      (lower.length >= 3 ? p.labelBn.includes(lower) : p.labelBn.startsWith(lower)) ||
      // Two letters (a code like "GP" or "RE…") only match a whole keyword,
      // so short codes still lead with shares, not pages.
      p.keys.some((k) => k === lower || (lower.length >= 3 && k.includes(lower)) || (k.length >= 3 && lower.includes(k))),
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
      } else if (companies.length === 0 && /^[A-Za-z0-9&.-]{2,15}$/.test(query.trim())) {
        // The company list didn't load: a typed code is the reader's best
        // guess, so open it. With the list loaded, no match means no such
        // share, and Enter stays put instead of opening a 404.
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
                en="No share or page matches that. Try the trading code (for example GP) or the company's name in English."
                bn="এ নামে কোনো শেয়ার বা পেজ পাওয়া যায়নি। ট্রেডিং কোড (যেমন GP) বা কোম্পানির ইংরেজি নাম লিখে দেখুন।"
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
                  কোড (যেমন <strong>GP</strong> বা <strong>BATBC</strong>), কোম্পানির ইংরেজি নাম, অথবা{" "}
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
