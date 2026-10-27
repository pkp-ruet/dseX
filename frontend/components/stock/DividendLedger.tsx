"use client";

import { useState } from "react";
import type { DividendDeclarationRecord } from "@/lib/api";
import { formatDate, money } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";

const d2 = (iso: string | null | undefined) => (iso ? <T en={formatDate(iso)} bn={bnDate(iso) || formatDate(iso)} /> : "—");
const periodT = (p: string) => <T en={p} bn={p.replace(/^FY (\d{4})$/, "$1 অর্থবছর")} />;
const typeT = (t: string | null | undefined) => {
  const en = t || "Final";
  return <T en={en} bn={/interim/i.test(en) ? "অন্তর্বর্তী" : "চূড়ান্ত"} />;
};

export interface LedgerRow {
  r: DividendDeclarationRecord;
  period: string;
  cash: number;
  stock: number;
}

interface Props {
  rows: LedgerRow[];
  face: number;
  initial?: number;
}

const MUTED = { color: "var(--text-muted)" } as const;
const INK = { color: "var(--text)" } as const;

/**
 * The declarations ledger, mobile-first.
 *
 * Below `sm` each declaration is a stacked card (period + type on top, then
 * cash / bonus / record date / AGM as a 2×2 grid) — nothing to swipe, nothing
 * clipped on a 360px phone. From `sm` up it is the classic five-column table.
 * Both are in the DOM and toggled with responsive classes.
 */
export default function DividendLedger({ rows, face, initial = 6 }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, initial);
  const hidden = rows.length - visible.length;

  const cashCell = (cash: number, stock: number, big = false, yearTotal?: number | null) => {
    const none = cash === 0 && stock === 0;
    const cashPerShare = cash > 0 ? (cash / 100) * face : null;
    if (none) {
      return (
        <span className="text-xs font-semibold" style={MUTED}>
          <T en="No dividend" bn="ডিভিডেন্ড নেই" />
        </span>
      );
    }
    if (cash <= 0) return <span style={MUTED}>—</span>;
    return (
      <>
        <span className={`font-bold ${big ? "text-base" : ""} text-positive`}>{cash}%</span>
        {cashPerShare != null && (
          <span className="block text-xs" style={MUTED}>
            <T en={`${money(cashPerShare)} a share`} bn={`শেয়ারপ্রতি ${money(cashPerShare)}`} />
          </span>
        )}
        {yearTotal != null && yearTotal > cash && (
          <span className="block text-xs" style={MUTED}>
            <T en={`${yearTotal}% for the whole year, including the interim`} bn={`অন্তর্বর্তীসহ পুরো বছরে ${yearTotal}%`} />
          </span>
        )}
      </>
    );
  };

  const bonusCell = (stock: number, big = false) =>
    stock > 0
      ? <span className={`font-bold ${big ? "text-base" : ""} text-info`}>{stock}%</span>
      : <span style={MUTED}>—</span>;

  return (
    <Card padding="none" className="rounded-2xl overflow-hidden">
      {/* ---- Phone: stacked cards ------------------------------------------ */}
      <ul className="sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
        {visible.map(({ r, period, cash, stock }, i) => (
          <li key={`${r.declaration_date}-${i}`} className="p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-baseline justify-between gap-3 mb-2.5">
              <span className="text-sm font-bold" style={INK}>{periodT(period)}</span>
              <span className="text-xs text-right" style={MUTED}>
                {typeT(r.dividend_type)} · <T en="declared" bn="ঘোষণা" /> {d2(r.declaration_date)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs font-semibold mb-0.5" style={MUTED}><T en="Cash" bn="নগদ" /></dt>
                <dd className="tabular-nums nums leading-tight">{cashCell(cash, stock, true, r.declared_total_cash_pct)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold mb-0.5" style={MUTED}><T en="Bonus" bn="বোনাস" /></dt>
                <dd className="tabular-nums nums leading-tight">{bonusCell(stock, true)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold mb-0.5" style={MUTED}><T en="Record date" bn="রেকর্ড ডেট" /></dt>
                <dd className="text-sm font-semibold tabular-nums nums" style={r.record_date ? INK : MUTED}>
                  {r.record_date ? d2(r.record_date) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold mb-0.5" style={MUTED}><T en="AGM" bn="এজিএম" /></dt>
                <dd className="text-sm font-semibold tabular-nums nums" style={r.agm_date ? INK : MUTED}>
                  {r.agm_date ? d2(r.agm_date) : "—"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* ---- Tablet and up: the table --------------------------------------- */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-2">
              <th scope="col" className="text-left font-bold px-3 py-2.5" style={MUTED}><T en="Year" bn="বছর" /></th>
              <th scope="col" className="text-right font-bold px-3 py-2.5" style={MUTED}><T en="Cash" bn="নগদ" /></th>
              <th scope="col" className="text-right font-bold px-3 py-2.5" style={MUTED}><T en="Bonus" bn="বোনাস" /></th>
              <th scope="col" className="text-right font-bold px-3 py-2.5" style={MUTED}><T en="Record date" bn="রেকর্ড ডেট" /></th>
              <th scope="col" className="text-right font-bold px-3 py-2.5" style={MUTED}><T en="AGM" bn="এজিএম" /></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ r, period, cash, stock }, i) => (
              <tr key={`${r.declaration_date}-${i}`} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="font-semibold" style={INK}>{periodT(period)}</span>
                  <span className="block text-xs" style={MUTED}>
                    {typeT(r.dividend_type)} · <T en="declared" bn="ঘোষণা" /> {d2(r.declaration_date)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums nums whitespace-nowrap">{cashCell(cash, stock, false, r.declared_total_cash_pct)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums nums whitespace-nowrap">{bonusCell(stock)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums nums whitespace-nowrap" style={INK}>
                  {r.record_date ? d2(r.record_date) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums nums whitespace-nowrap" style={MUTED}>
                  {r.agm_date ? d2(r.agm_date) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > initial && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full text-left px-4 sm:px-3 py-2.5 text-xs font-semibold"
          style={{ color: "var(--primary)", borderTop: "1px solid var(--border)" }}
        >
          {showAll ? (
            <T en="Show fewer ▴" bn="কম দেখুন ▴" />
          ) : (
            <T
              en={`Show ${hidden} earlier ${hidden === 1 ? "declaration" : "declarations"} ▾`}
              bn={`আগের আরও ${hidden}টি ঘোষণা দেখুন ▾`}
            />
          )}
        </button>
      )}

      <p className="px-4 sm:px-3 py-2.5 text-xs leading-snug" style={{ ...MUTED, borderTop: "1px solid var(--border)" }}>
        <T
          en={`Cash is a % of the ৳${face % 1 === 0 ? face.toFixed(0) : face.toFixed(2)} face value, not of the share price. A bonus is the number of extra shares you get for every 100 you hold.`}
          bn={`নগদ ডিভিডেন্ড ৳${face % 1 === 0 ? face.toFixed(0) : face.toFixed(2)} অভিহিত মূল্যের শতাংশ, শেয়ারের দামের নয়। বোনাস মানে প্রতি 100 শেয়ারে কতটি বাড়তি শেয়ার পাবেন।`}
        />
      </p>
    </Card>
  );
}
