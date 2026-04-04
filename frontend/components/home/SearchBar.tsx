"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Company {
  trading_code: string;
  company_name: string | null;
}

interface Props {
  companies: Company[];
  variant?: "default" | "sidebar";
}

export default function SearchBar({ companies, variant = "default" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getSuggestions = useCallback(
    (q: string): Company[] => {
      if (q.length < 2) return [];
      const lower = q.toLowerCase();
      return companies
        .filter(
          (c) =>
            c.trading_code.toLowerCase().includes(lower) ||
            (c.company_name && c.company_name.toLowerCase().includes(lower))
        )
        .slice(0, 8);
    },
    [companies]
  );

  useEffect(() => {
    const results = getSuggestions(query);
    setSuggestions(results);
    setActiveIndex(-1);
  }, [query, getSuggestions]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function navigate(code: string) {
    setSuggestions([]);
    setQuery("");
    router.push(`/stock/${code}`);
  }

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
      setSuggestions([]);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  const open = suggestions.length > 0;

  const wrapClass = variant === "sidebar"
    ? "search-bar-wrap search-bar-wrap--sidebar"
    : "search-bar-wrap";

  return (
    <div className={wrapClass} ref={containerRef}>
      <div className={`search-bar-box${open ? " search-bar-open" : ""}`}>
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
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search companies"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="search-suggestions" role="listbox">
          {suggestions.map((c, i) => (
            <li
              key={c.trading_code}
              role="option"
              aria-selected={i === activeIndex}
              className={`search-suggestion-item${i === activeIndex ? " search-suggestion-active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); navigate(c.trading_code); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="search-suggestion-code">{c.trading_code}</span>
              {c.company_name && (
                <span className="search-suggestion-name">{c.company_name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
