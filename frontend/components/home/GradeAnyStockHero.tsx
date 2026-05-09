"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { ScoreItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Mode = "idle" | "checking" | "result" | "limit";

interface Props {
  items: ScoreItem[];
}

const FREE_LIMIT_KEY = "dsex.grade-demo.count";
const FREE_LIMIT_DAY_KEY = "dsex.grade-demo.day";
const FREE_LIMIT_PER_DAY = 1;

const PILLAR_BARS: { key: keyof ScoreItem; label: string }[] = [
  { key: "p1_biz",    label: "Profits" },
  { key: "p2_health", label: "Debt & Cash Safety" },
  { key: "p3_moat",   label: "Business Strength" },
  { key: "p4_val",    label: "Fair Price" },
  { key: "p5_div",    label: "Dividend Safety" },
];

const PLACEHOLDERS = ["Try GP", "Try Beximco", "Try Square Pharma"];
const DEMO_CHIPS = ["GP", "BEXIMCO", "SQURPHARMA"];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const day = window.localStorage.getItem(FREE_LIMIT_DAY_KEY);
    if (day !== todayKey()) return 0;
    const n = Number(window.localStorage.getItem(FREE_LIMIT_KEY) || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function bumpUsed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FREE_LIMIT_DAY_KEY, todayKey());
    window.localStorage.setItem(FREE_LIMIT_KEY, String(readUsed() + 1));
  } catch {}
}

function gradeOf(score: number | null): { letter: string; word: string; color: string } {
  if (score == null) return { letter: "?", word: "Unknown", color: "#94A3B8" };
  if (score >= 80) return { letter: "A", word: "Excellent", color: "#34D399" };
  if (score >= 70) return { letter: "B", word: "Good",      color: "#4ADE80" };
  if (score >= 60) return { letter: "C", word: "Fair",      color: "#60A5FA" };
  if (score >= 50) return { letter: "D", word: "Watch",     color: "#FBBF24" };
  return { letter: "F", word: "Risky",                       color: "#F87171" };
}

function plainSummary(item: ScoreItem): string {
  const score = item.score ?? 0;
  const strong: string[] = [];
  if ((item.p1_biz ?? 0) >= 7) strong.push("solid profits");
  if ((item.p2_health ?? 0) >= 7) strong.push("low debt");
  if ((item.p4_val ?? 0) >= 7) strong.push("fair price");
  if ((item.p5_div ?? 0) >= 7) strong.push("steady dividend");

  if (score >= 70 && strong.length >= 2) {
    return `Strong company with ${strong.slice(0, 3).join(", ")}.`;
  }
  if (score >= 60) return "A reasonable company at a fair price.";
  if (score >= 50) return "Mixed picture — worth watching, not rushing in.";
  return "Some clear weaknesses — be careful.";
}

interface BarProps {
  label: string;
  value: number | null;
  delay: number;
  visible: boolean;
}

function PillarBar({ label, value, delay, visible }: BarProps) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v * 10));
  const color = v >= 7 ? "#34D399" : v >= 4 ? "#FBBF24" : "#F87171";
  const word = v >= 7 ? "Strong" : v >= 4 ? "Fair" : "Weak";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text)] font-semibold">{label}</span>
        <span className="font-bold" style={{ color }}>{word}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--border)]/40 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: visible ? `${pct}%` : "0%",
            background: color,
            transition: `width 700ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

export default function GradeAnyStockHero({ items }: Props) {
  const { isLoggedIn } = useAuth();
  const [mode, setMode] = useState<Mode>("idle");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [picked, setPicked] = useState<ScoreItem | null>(null);
  const [barsVisible, setBarsVisible] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [usedCount, setUsedCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsedCount(readUsed());
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length;
      setPlaceholder(PLACEHOLDERS[i]);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const lookup = useMemo(() => {
    const m = new Map<string, ScoreItem>();
    for (const it of items) m.set(it.trading_code.toUpperCase(), it);
    return m;
  }, [items]);

  const suggestions = useMemo<ScoreItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return items
      .filter((c) =>
        c.trading_code.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [items, query]);

  // Close suggestions on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const runCheck = useCallback(
    (code: string) => {
      const upper = code.trim().toUpperCase();
      if (!upper) return;
      const item = lookup.get(upper);
      if (!item) {
        // Not a graded stock — bounce to stock detail page anyway so user lands somewhere
        window.location.href = `/stock/${upper}`;
        return;
      }

      // Free-tier limit (anonymous users only)
      if (!isLoggedIn && readUsed() >= FREE_LIMIT_PER_DAY) {
        setPicked(item);
        setMode("limit");
        return;
      }

      setQuery("");
      setActiveIndex(-1);
      setPicked(item);
      setMode("checking");
      setBarsVisible(false);

      window.setTimeout(() => {
        setMode("result");
        // Trigger bar fill on next frame
        requestAnimationFrame(() => setBarsVisible(true));
        if (!isLoggedIn) {
          bumpUsed();
          setUsedCount(readUsed());
        }
      }, 650);
    },
    [lookup, isLoggedIn]
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          runCheck(suggestions[activeIndex].trading_code);
        } else if (suggestions[0]) {
          runCheck(suggestions[0].trading_code);
        } else if (query.trim()) {
          runCheck(query.trim());
        }
      } else if (e.key === "Escape") {
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    },
    [activeIndex, suggestions, query, runCheck]
  );

  const reset = () => {
    setMode("idle");
    setPicked(null);
    setQuery("");
    setBarsVisible(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const grade = picked ? gradeOf(picked.score) : null;
  const showSuggestions = mode === "idle" && suggestions.length > 0 && activeIndex >= -1 && query.length >= 1;

  return (
    <section
      aria-label="Grade any stock"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] relative h-full flex flex-col min-h-[400px] sm:min-h-[440px] md:min-h-0"
    >
      <div className="overflow-hidden rounded-t-2xl">
        <div
          className="h-1.5 w-full"
          style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
        />
      </div>

      <div className="p-5 sm:p-6 md:p-5 flex-1 flex flex-col">
        {/* Idle state — poster-style centered headline + search */}
        {mode === "idle" && (
          <div ref={containerRef} className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-extrabold text-[var(--text)] leading-[1.05] tracking-tight">
                Check Any Stock
              </h2>
              <p className="mt-1.5 text-base sm:text-lg md:text-lg lg:text-xl font-semibold text-[var(--primary)] leading-tight">
                in 5 seconds.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl border-2 border-[var(--border)] bg-[var(--bg,#0c1117)] focus-within:border-[var(--primary)] transition-colors px-4 py-3 sm:py-3.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-[var(--text-muted)] shrink-0">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent outline-none text-base sm:text-lg text-[var(--text)] placeholder:text-[var(--text-muted)] min-w-0"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Search any DSE stock"
                />
                <button
                  type="button"
                  onClick={() => suggestions[0] ? runCheck(suggestions[0].trading_code) : query.trim() && runCheck(query.trim())}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm sm:text-base font-bold whitespace-nowrap hover:opacity-90 transition-opacity"
                  aria-label="Check stock"
                >
                  Check →
                </button>
              </div>

              {showSuggestions && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
                >
                  {suggestions.map((c, i) => (
                    <li
                      key={c.trading_code}
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseDown={(e) => { e.preventDefault(); runCheck(c.trading_code); }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer ${
                        i === activeIndex ? "bg-[var(--primary)]/10" : "hover:bg-[var(--border)]/30"
                      }`}
                    >
                      <span className="font-bold text-[var(--text)] min-w-[80px]">{c.trading_code}</span>
                      {c.company_name && (
                        <span className="text-[var(--text-muted)] text-xs truncate">{c.company_name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Demo chips — centered */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {DEMO_CHIPS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => runCheck(code)}
                  className="px-3.5 py-1.5 rounded-full text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
              {isLoggedIn
                ? "Free for you — check as many as you like."
                : `Free · ${Math.max(0, FREE_LIMIT_PER_DAY - usedCount)} check left today`}
            </p>
          </div>
        )}

        {/* Checking state — animated spinner */}
        {mode === "checking" && picked && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 sm:py-16">
            <span
              className="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--primary)] border-t-transparent animate-spin"
              aria-hidden="true"
            />
            <span className="text-base sm:text-lg text-[var(--text-muted)]">
              Checking <span className="font-bold text-[var(--text)]">{picked.trading_code}</span>…
            </span>
          </div>
        )}

        {/* Result */}
        {mode === "result" && picked && grade && (
          <div className="animate-[fadeIn_300ms_ease-out] flex-1 flex flex-col">
            <div className="flex items-start gap-4 mb-5">
              <div
                className="flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 shrink-0"
                style={{
                  borderColor: grade.color,
                  background: `${grade.color}1f`,
                  color: grade.color,
                }}
              >
                <span className="text-4xl sm:text-5xl font-extrabold leading-none">{grade.letter}</span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider mt-1 font-bold">{grade.word}</span>
              </div>
              <div className="flex-1 min-w-0">
                {picked.sector && (
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-0.5">
                    {picked.sector}
                  </p>
                )}
                <p className="text-xl sm:text-2xl font-extrabold text-[var(--text)] leading-tight truncate">
                  {picked.trading_code}
                </p>
                {picked.company_name && (
                  <p className="text-sm text-[var(--text-muted)] truncate">
                    {picked.company_name}
                  </p>
                )}
                <p className="text-base sm:text-lg font-bold mt-1.5" style={{ color: grade.color }}>
                  {Math.round(picked.score ?? 0)}/100 · {grade.word}
                </p>
              </div>
            </div>

            {/* Pillar bars */}
            <div className="flex flex-col gap-3 mb-5">
              {PILLAR_BARS.map((p, idx) => (
                <PillarBar
                  key={p.key}
                  label={p.label}
                  value={(picked[p.key] as number | null | undefined) ?? null}
                  delay={idx * 90}
                  visible={barsVisible}
                />
              ))}
            </div>

            {/* Plain summary */}
            <div
              className="rounded-xl border-2 px-4 py-3 mb-5 text-sm sm:text-base leading-relaxed"
              style={{
                borderColor: `${grade.color}66`,
                background: `${grade.color}10`,
                color: "var(--text)",
              }}
            >
              <span className="font-bold block mb-0.5" style={{ color: grade.color }}>In one line</span>
              {plainSummary(picked)}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
              <Link
                href={`/stock/${picked.trading_code}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-base font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
              >
                See full report
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-base font-bold border-2 border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors"
              >
                Check another
              </button>
            </div>
          </div>
        )}

        {/* Limit reached — signup gate */}
        {mode === "limit" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
            <div className="text-5xl sm:text-6xl mb-3" aria-hidden="true">🔒</div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] mb-2 leading-tight">
              That&apos;s your free check.
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed mb-5 max-w-sm">
              Sign up free to check any stock, save your favorites, and get tomorrow&apos;s top pick.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
              <Link
                href="/register"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-base font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-base font-bold border-2 border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
