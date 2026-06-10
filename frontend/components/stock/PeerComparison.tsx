"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { RelatedStock } from "@/lib/api";
import { getTier, TIER_COLORS } from "@/lib/constants";
import { peerStandingCaption } from "@/lib/plain-language";

export interface PeerRow {
  trading_code: string;
  company_name: string | null;
  score: number | null;
  ltp: number | null;
  change_pct: number | null;
  pe: number | null;
  div_yield_pct: number | null;
  roe_pct: number | null;
  isCurrent?: boolean;
}

interface Props {
  current: PeerRow;
  peers: RelatedStock[];
  sector: string | null;
}

type SortKey = "score" | "ltp" | "change_pct" | "pe" | "div_yield_pct" | "roe_pct";

function num(v: number | null | undefined): number | null {
  return v == null ? null : v;
}

function fmt(v: number | null, kind: "score" | "price" | "pct" | "ratio"): string {
  if (v == null) return "—";
  switch (kind) {
    case "score": return v.toFixed(0);
    case "price": return `৳${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)}`;
    case "pct": return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
    case "ratio": return v.toFixed(1);
  }
}

export default function PeerComparison({ current, peers, sector }: Props) {
  const rows: PeerRow[] = useMemo(() => {
    const peerRows: PeerRow[] = peers.map((p) => ({
      trading_code: p.trading_code,
      company_name: p.company_name,
      score: num(p.score),
      ltp: num(p.ltp),
      change_pct: num(p.change_pct),
      pe: num(p.pe),
      div_yield_pct: num(p.div_yield_pct),
      roe_pct: num(p.roe_pct),
    }));
    return [{ ...current, isCurrent: true }, ...peerRows];
  }, [current, peers]);

  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);

  // Only render optional columns when at least one row has the data.
  const showPe = rows.some((r) => r.pe != null);
  const showYield = rows.some((r) => r.div_yield_pct != null);
  const showRoe = rows.some((r) => r.roe_pct != null);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return asc ? av - bv : bv - av;
    });
    return copy;
  }, [rows, sortKey, asc]);

  const caption = peerStandingCaption(
    current.trading_code,
    current.score,
    peers.map((p) => num(p.score)),
  );

  if (peers.length === 0) return null;

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else { setSortKey(key); setAsc(false); }
  }

  type Col = { key: SortKey; label: string; kind: "score" | "price" | "pct" | "ratio"; show: boolean };
  const cols: Col[] = ([
    { key: "score", label: "Score", kind: "score", show: true },
    { key: "ltp", label: "Price", kind: "price", show: true },
    { key: "change_pct", label: "Today", kind: "pct", show: true },
    { key: "pe", label: "P/E", kind: "ratio", show: showPe },
    { key: "div_yield_pct", label: "Yield", kind: "pct", show: showYield },
    { key: "roe_pct", label: "ROE", kind: "pct", show: showRoe },
  ] as Col[]).filter((c) => c.show);

  return (
    <section id="peers" className="mb-8 scroll-mt-[112px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        How It Stacks Up
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {caption ?? `${current.trading_code} versus the strongest names in ${sector ?? "its sector"}.`}
      </p>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th
                  scope="col"
                  className="text-left font-bold px-3 py-2.5 sticky left-0 z-10"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  Stock
                </th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sortKey === c.key ? (asc ? "ascending" : "descending") : "none"}
                    className="px-3 py-2.5 text-right whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="font-bold inline-flex items-center gap-1"
                      style={{ color: sortKey === c.key ? "var(--primary)" : "var(--text-muted)" }}
                    >
                      {c.label}
                      {sortKey === c.key && <span aria-hidden="true">{asc ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const tierColor = TIER_COLORS[getTier(r.score)];
                return (
                  <tr
                    key={r.trading_code}
                    style={{
                      background: r.isCurrent ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--surface)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <th
                      scope="row"
                      className="text-left px-3 py-2.5 sticky left-0 z-10"
                      style={{
                        background: r.isCurrent ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)",
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block rounded-full shrink-0"
                          style={{ width: 8, height: 8, background: tierColor }}
                          aria-hidden="true"
                        />
                        {r.isCurrent ? (
                          <span className="font-bold" style={{ color: "var(--text)" }}>{r.trading_code}</span>
                        ) : (
                          <Link
                            prefetch={false} href={`/stock/${r.trading_code}`}
                            className="font-semibold hover:underline"
                            style={{ color: "var(--primary)" }}
                          >
                            {r.trading_code}
                          </Link>
                        )}
                      </span>
                    </th>
                    {cols.map((c) => {
                      const val = r[c.key];
                      const color =
                        c.kind === "pct" && c.key === "change_pct" && val != null
                          ? val >= 0 ? "var(--positive)" : "var(--negative)"
                          : "var(--text)";
                      return (
                        <td
                          key={c.key}
                          className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap"
                          style={{ color }}
                        >
                          {fmt(val, c.kind)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
