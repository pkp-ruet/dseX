"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ScoreItem } from "@/lib/api";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";
import { taka } from "@/lib/formatters";

type Tab = "all" | "strong";
type SortKey = "match" | "gainers" | "losers" | "dividend";

interface Props {
  /** Every buy signal (strong + normal). Sell is not shown in the UI. */
  buy: ScoreItem[];
  sectors: string[];
}

const SORT_LABELS: Record<SortKey, string> = {
  match: "Best match",
  gainers: "Today's gainers",
  losers: "Today's losers",
  dividend: "Dividend yield",
};

const PAGE = 48;

const num = (v: number | null | undefined, fallback: number) =>
  v == null ? fallback : v;

const isStrong = (i: ScoreItem) => i.signal?.strength === "strong";

function sortItems(list: ScoreItem[], sort: SortKey): ScoreItem[] {
  const arr = [...list];
  switch (sort) {
    case "gainers":
      return arr.sort((a, b) => num(b.change_pct, -Infinity) - num(a.change_pct, -Infinity));
    case "losers":
      return arr.sort((a, b) => num(a.change_pct, Infinity) - num(b.change_pct, Infinity));
    case "dividend":
      return arr.sort((a, b) => num(b.div_yield_pct, -1) - num(a.div_yield_pct, -1));
    default:
      // "Best match": Strong buys first, then by fundamental score.
      return arr.sort(
        (a, b) =>
          Number(isStrong(b)) - Number(isStrong(a)) || num(b.score, -1) - num(a.score, -1),
      );
  }
}

export default function SignalsExplorer({ buy, sectors }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState<SortKey>("match");
  const [limit, setLimit] = useState(PAGE);

  // Any change to the view resets pagination to the top.
  useEffect(() => {
    setLimit(PAGE);
  }, [tab, query, sector, sort]);

  const strongBuys = useMemo(() => buy.filter(isStrong), [buy]);
  const base = tab === "strong" ? strongBuys : buy;
  const tone = "var(--positive)";

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    const list = base.filter((item) => {
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
    return sortItems(list, sort);
  }, [base, query, sector, sort]);

  const shown = filtered.slice(0, limit);
  const isFiltered = query.trim() !== "" || sector !== "all";

  const reset = () => {
    setQuery("");
    setSector("all");
  };

  return (
    <div className="mt-7">
      {/* Segmented All buys / Strong buys toggle */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <TabButton
          active={tab === "all"}
          tone="var(--positive)"
          glyph="▲"
          label="All buys"
          count={buy.length}
          onClick={() => setTab("all")}
        />
        <TabButton
          active={tab === "strong"}
          tone="var(--positive)"
          glyph="★"
          label="Strong buys"
          count={strongBuys.length}
          onClick={() => setTab("strong")}
        />
      </div>

      {/* Search + sector + sort controls */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            style={{ color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or company…"
            aria-label="Search companies"
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--primary)]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Filter by sector"
          className="rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer focus:border-[var(--primary)]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort signals"
          className="rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer focus:border-[var(--primary)]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <div
        className="flex items-center justify-between mt-3 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        <span>
          Showing{" "}
          <b style={{ color: "var(--text)" }}>{Math.min(limit, filtered.length)}</b> of{" "}
          {filtered.length}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={reset}
            className="font-semibold hover:underline"
            style={{ color: "var(--primary)" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Cards */}
      {shown.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl mt-4"
          style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
        >
          <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
            No {tab === "strong" ? "strong buy" : "buy"} signals match
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Try a different search or sector.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
          {shown.map((item) => (
            <SignalCard key={item.trading_code} item={item} />
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="rounded-full px-6 py-2.5 text-sm font-bold transition-colors hover:opacity-85"
            style={{
              background: `color-mix(in srgb, ${tone} 8%, var(--surface))`,
              border: `1px solid ${tone}`,
              color: tone,
            }}
          >
            Show {Math.min(PAGE, filtered.length - limit)} more
          </button>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  tone,
  glyph,
  label,
  count,
  onClick,
}: {
  active: boolean;
  tone: string;
  glyph: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 font-bold transition-all"
      style={{
        color: active ? "#fff" : "var(--text)",
        background: active ? tone : "var(--surface)",
        border: `1px solid ${active ? tone : "var(--border)"}`,
        boxShadow: active ? "var(--shadow-soft)" : "none",
      }}
    >
      <span aria-hidden style={{ fontSize: 10 }}>
        {glyph}
      </span>
      <span className="text-sm sm:text-base">{label}</span>
      <span
        className="tabular-nums"
        style={{
          background: active ? "rgba(255,255,255,0.22)" : `color-mix(in srgb, ${tone} 12%, transparent)`,
          color: active ? "#fff" : tone,
          padding: "1px 8px",
          borderRadius: 999,
          fontSize: "0.78rem",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function SignalCard({ item }: { item: ScoreItem }) {
  const tone = "var(--positive)";
  const sig = item.signal;
  const score = item.score;
  const chg = item.change_pct;
  const chgColor =
    chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <Link
      prefetch={false}
      href={`/stock/${item.trading_code}`}
      className="group relative block rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-16px_rgba(28,25,23,0.22)]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Signal-toned left accent */}
      <span
        aria-hidden
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 4, background: tone }}
      />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        {/* Header: code + tier + star */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-mono font-black text-lg leading-none group-hover:underline"
                style={{ color: "var(--primary)" }}
              >
                {item.trading_code}
              </span>
              {score != null && <TierPill score={score} size="sm" />}
            </div>
            {item.company_name && (
              <p className="text-sm mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                {item.company_name}
              </p>
            )}
          </div>
          <StarButton code={item.trading_code} size="md" />
        </div>

        {/* Signal chip + plain-English reason */}
        <div className="mt-3 flex items-start gap-2.5">
          {sig && <SignalChip signal={sig.signal} strength={sig.strength} size="md" />}
          {sig?.reason_en && (
            <p className="text-[13px] leading-snug font-medium flex-1" style={{ color: "var(--text)" }}>
              {sig.reason_en}
            </p>
          )}
        </div>

        {/* Metrics strip */}
        <div
          className="mt-3.5 pt-3 flex items-center gap-4 text-sm"
          style={{ borderTop: "1px dashed var(--border)" }}
        >
          <div className="tabular-nums shrink-0">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Score{" "}
            </span>
            <b style={{ color: "var(--text)" }}>{score != null ? Math.round(score) : "--"}</b>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              /100
            </span>
          </div>
          <div className="tabular-nums shrink-0">
            <b style={{ color: "var(--text)" }}>
              {taka(item.ltp, item.ltp != null && item.ltp >= 100 ? 0 : 1)}
            </b>
            {chg != null && (
              <span className="ml-1.5 font-semibold" style={{ color: chgColor }}>
                {chg >= 0 ? "+" : ""}
                {chg.toFixed(1)}%
              </span>
            )}
          </div>
          {item.sector && (
            <span
              className="ml-auto text-xs truncate max-w-[42%] px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {item.sector}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
