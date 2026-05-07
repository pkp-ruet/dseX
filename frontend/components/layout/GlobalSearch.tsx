"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getInsightScores } from "@/lib/api";

interface Company {
  trading_code: string;
  company_name: string | null;
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for global open event
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
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

  const suggestions = getSuggestions(query);

  const navigate = useCallback(
    (code: string) => {
      close();
      router.push(`/stock/${code.toUpperCase()}`);
    },
    [close, router]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        navigate(suggestions[activeIndex].trading_code);
      } else if (suggestions.length > 0) {
        navigate(suggestions[0].trading_code);
      } else if (query.trim()) {
        navigate(query.trim().toUpperCase());
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  return (
    <div
      className="global-search-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search stocks"
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
            placeholder="Search by code or company name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-label="Search companies"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
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

        {suggestions.length > 0 ? (
          <ul
            id="global-search-listbox"
            className="search-suggestions global-search-suggestions"
            role="listbox"
          >
            {suggestions.map((c, i) => (
              <li
                key={c.trading_code}
                id={`global-search-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`search-suggestion-item${
                  i === activeIndex ? " search-suggestion-active" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(c.trading_code);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="search-suggestion-code">{c.trading_code}</span>
                {c.company_name && (
                  <span className="search-suggestion-name">{c.company_name}</span>
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
            Type a code (e.g. <strong>GP</strong>, <strong>BATBC</strong>) or a company name.
          </div>
        )}
      </div>
    </div>
  );
}
