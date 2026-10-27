"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { BiText, RelatedStock } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import Card from "@/components/ui/Card";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SectionTitle from "@/components/stock/SectionTitle";

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
  /** Shown when the peers are not the same kind of business (services/sub_industry.py). */
  note?: BiText | null;
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

export default function PeerComparison({ current, peers, sector, note = null }: Props) {
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

  if (peers.length === 0) return null;

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else { setSortKey(key); setAsc(false); }
  }

  // `wide`: shown from 640px only. Price and today's move are on each peer's
  // own page; dropping them on a phone lets the comparison fit the screen
  // instead of scrolling sideways.
  type Col = { key: SortKey; en: string; bn: string; kind: "score" | "price" | "pct" | "ratio"; show: boolean; wide?: boolean };
  const cols: Col[] = ([
    { key: "score", en: "Score", bn: "স্কোর", kind: "score", show: true },
    { key: "ltp", en: "Price", bn: "দাম", kind: "price", show: true, wide: true },
    { key: "change_pct", en: "Today", bn: "আজ", kind: "pct", show: true, wide: true },
    { key: "pe", en: "P/E", bn: "পিই", kind: "ratio", show: showPe },
    { key: "div_yield_pct", en: "Yield", bn: "ইল্ড", kind: "pct", show: showYield },
    { key: "roe_pct", en: "ROE", bn: "আরওই", kind: "pct", show: showRoe },
  ] as Col[]).filter((c) => c.show);
  const cell = (c: Col) => `px-2 sm:px-3 ${c.wide ? "hidden sm:table-cell" : ""}`;

  return (
    <section id="peers" className="mb-8 stock-anchor">
      <SectionTitle
        title={<T en="Compared with similar companies" bn="একই ধরনের কোম্পানির সঙ্গে তুলনা" />}
        sub={
          <T
            en={`${current.trading_code} next to the strongest companies in ${sector ?? "its sector"}.`}
            bn={`${sector ? `${sectorBn(sector)} সেক্টরের` : "একই সেক্টরের"} সবচেয়ে শক্ত কোম্পানিগুলোর পাশে ${current.trading_code}।`}
          />
        }
      />

      {/* The table is free facts; where it stands among them (peerStandingCaption)
          is part of the full verdict's price question. The note is a caveat about
          the table itself, so it stays here. */}
      {note && (
        <p className="mb-3 text-sm leading-snug rounded-xl px-3 py-2.5 bg-surface-2 text-text-muted">
          <T en={note.en} bn={note.bn} />
        </p>
      )}

      <Card padding="none" className="rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th
                  scope="col"
                  className="text-left font-bold px-2 sm:px-3 py-2.5 sticky left-0 z-10"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  <T en="Share" bn="শেয়ার" />
                </th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sortKey === c.key ? (asc ? "ascending" : "descending") : "none"}
                    className={`${cell(c)} py-2.5 text-right whitespace-nowrap`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="font-bold inline-flex items-center gap-1"
                      style={{ color: sortKey === c.key ? "var(--primary)" : "var(--text-muted)" }}
                    >
                      <T en={c.en} bn={c.bn} />
                      {sortKey === c.key && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          {asc ? <path d="M12 4 21 19H3z" /> : <path d="M12 20 3 5h18z" />}
                        </svg>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
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
                      className="text-left px-2 sm:px-3 py-2.5 sticky left-0 z-10"
                      style={{
                        background: r.isCurrent ? "color-mix(in srgb, var(--primary) 8%, var(--surface))" : "var(--surface)",
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        {r.isCurrent ? (
                          <span className="font-bold text-text-main">{r.trading_code}</span>
                        ) : (
                          <Link
                            prefetch={false} href={`/stock/${r.trading_code}`}
                            className="font-semibold hover:underline text-primary"
                          >
                            {r.trading_code}
                          </Link>
                        )}
                      </span>
                    </th>
                    {cols.map((c) => {
                      const val = r[c.key];
                      if (c.kind === "score") {
                        return (
                          <td key={c.key} className={`${cell(c)} py-1.5 text-right whitespace-nowrap`}>
                            <ScoreBadge score={val} size="sm" />
                          </td>
                        );
                      }
                      const color =
                        c.kind === "pct" && c.key === "change_pct" && val != null
                          ? val >= 0 ? "var(--positive)" : "var(--negative)"
                          : "var(--text)";
                      return (
                        <td
                          key={c.key}
                          className={`${cell(c)} py-2.5 text-right tabular-nums nums whitespace-nowrap`}
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
      </Card>
    </section>
  );
}
