"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { BiText, RelatedStock } from "@/lib/api";
import { useStockLang } from "@/context/StockLangContext";
import { peerStandingCaption } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SectionTitle from "@/components/stock/SectionTitle";
import PremiumGate from "@/components/premium/PremiumGate";

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
  const { lang } = useStockLang();
  const isBn = lang === "bn";
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

  // `wide`: shown from 640px only. Price and today's move are on each peer's
  // own page; dropping them on a phone lets the comparison fit the screen
  // instead of scrolling sideways.
  type Col = { key: SortKey; label: string; kind: "score" | "price" | "pct" | "ratio"; show: boolean; wide?: boolean };
  const cols: Col[] = ([
    { key: "score", label: "Score", kind: "score", show: true },
    { key: "ltp", label: "Price", kind: "price", show: true, wide: true },
    { key: "change_pct", label: "Today", kind: "pct", show: true, wide: true },
    { key: "pe", label: "P/E", kind: "ratio", show: showPe },
    { key: "div_yield_pct", label: "Yield", kind: "pct", show: showYield },
    { key: "roe_pct", label: "ROE", kind: "pct", show: showRoe },
  ] as Col[]).filter((c) => c.show);
  const cell = (c: Col) => `px-2 sm:px-3 ${c.wide ? "hidden sm:table-cell" : ""}`;

  return (
    <section id="peers" className="mb-8 stock-anchor">
      <SectionTitle
        title="How It Stacks Up"
        sub={<>{current.trading_code} versus the strongest names in {sector ?? "its sector"}.</>}
        bn="একই সেক্টরের সেরা কোম্পানিগুলোর সাথে তুলনা।"
      />

      {/* Where it stands among them is Premium (screen-only lock); the table stays free. */}
      {(caption || note) && (
        <PremiumGate
          label={isBn ? "এটি কোথায় দাঁড়িয়ে" : "Where it stands among them"}
          preview="blur"
          peek={36}
          compact
          className="mb-3"
        >
          {caption && (
            <p className="text-sm font-semibold leading-snug mb-2 text-text-main">{caption}</p>
          )}
          {note && (
            <p
              className={`text-sm leading-snug rounded-xl px-3 py-2.5 ${isBn ? "font-bn" : ""}`}
              lang={isBn ? "bn" : undefined}
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {isBn ? note.bn : note.en}
            </p>
          )}
        </PremiumGate>
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
                  Stock
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
                      {c.label}
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
