"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Bn from "@/components/i18n/Bn";
import type { LandingStock } from "@/lib/landing";

/**
 * The hero's lookup field.
 *
 * Matches against the scores payload already in memory, so a result appears on
 * the same keystroke — no spinner, no request. Picking a company swaps the card
 * beside it rather than navigating away: the visitor gets the answer before
 * being asked for anything.
 */
export default function StockLookup({
  stocks,
  selected,
  onSelect,
}: {
  stocks: LandingStock[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const starts: LandingStock[] = [];
    const contains: LandingStock[] = [];
    for (const s of stocks) {
      const code = s.code.toLowerCase();
      const name = (s.name ?? "").toLowerCase();
      if (code.startsWith(q) || name.startsWith(q)) starts.push(s);
      else if (code.includes(q) || name.includes(q)) contains.push(s);
      if (starts.length >= 8) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [query, stocks]);

  useEffect(() => {
    setActive(-1);
    setOpen(matches.length > 0);
  }, [matches]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(code: string) {
    onSelect(code);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = active >= 0 ? matches[active] : matches[0];
      if (pick) choose(pick.code);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor="landing-lookup" className="mb-2 block">
        <span className="text-[0.82rem] font-bold text-[var(--text)]">
          Type any company name or code
        </span>
        <Bn as="span" className="mt-0.5 block text-[0.78rem] font-medium text-[var(--text-muted)]">
          যেকোনো কোম্পানির নাম বা কোড লিখুন
        </Bn>
      </label>

      <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))]">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0 text-[var(--text-muted)]">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          id="landing-lookup"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(matches.length > 0)}
          placeholder="GP, BRACBANK, Square…"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls="landing-lookup-list"
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-semibold text-[var(--text)] outline-none placeholder:font-normal placeholder:text-[var(--text-muted)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear"
            className="shrink-0 px-1 text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ×
          </button>
        )}
      </div>

      {open && matches.length > 0 && (
        <ul
          id="landing-lookup-list"
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lift)]"
        >
          {matches.map((s, i) => (
            <li
              key={s.code}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s.code);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${
                i === active ? "bg-[var(--surface-2)]" : ""
              }`}
            >
              <span className="w-[5.5rem] shrink-0 font-mono text-[0.78rem] font-extrabold text-[var(--text)]">
                {s.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.78rem] text-[var(--text-muted)]">
                {s.name ?? ""}
              </span>
              {s.score != null && (
                <span className="shrink-0 text-[0.75rem] font-extrabold tabular-nums nums text-[var(--text)]">
                  {Math.round(s.score)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="mt-2 text-[0.72rem] text-[var(--text-muted)]">
          Showing {selected} — type another name and it changes instantly.
        </p>
      )}
    </div>
  );
}
