"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ScoreItem } from "@/lib/api";
import Card from "@/components/ui/Card";
import { COLORS } from "./shared";

/* ------------------------------------------------------------------ *
 * Section wrapper — a titled card with an optional right-side note.
 * ------------------------------------------------------------------ */
export function Panel({
  title,
  note,
  children,
  className = "",
}: {
  title?: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card padding="none" className={`rounded-2xl p-4 sm:p-5 ${className}`}>
      {(title || note) && (
        <div className="flex items-baseline justify-between gap-2 mb-3">
          {title && <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>}
          {note && <span className="text-[11px] text-[var(--text-muted)]">{note}</span>}
        </div>
      )}
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * MetricTile — a single big-number KPI. Grid them with <MetricRow>.
 * ------------------------------------------------------------------ */
export interface Metric {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  hint?: string;
}

export function MetricRow({ metrics, cols }: { metrics: Metric[]; cols?: string }) {
  return (
    <div className={`grid gap-3 ${cols ?? "grid-cols-2 lg:grid-cols-4"}`}>
      {metrics.map((m) => (
        <Card key={m.label} padding="none" className="rounded-xl p-4" >
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {m.label}
            </p>
            {m.hint && (
              <span className="text-[var(--text-muted)] cursor-help" title={m.hint} aria-label={m.hint}>
                ⓘ
              </span>
            )}
          </div>
          <p className="mt-1.5 text-3xl font-bold tabular-nums nums leading-none" style={{ color: m.accent ?? "var(--text)" }}>
            {m.value}
          </p>
          {m.sub && <p className="mt-1.5 text-[11px] text-[var(--text-muted)] leading-tight">{m.sub}</p>}
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * BarList — a ranked horizontal-bar list (top pages, sections, …).
 * ------------------------------------------------------------------ */
export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  secondary?: ReactNode;
  href?: string;
}

export function BarList({
  items,
  color = COLORS.primary,
  emptyText = "No data yet.",
  valueSuffix,
}: {
  items: BarItem[];
  color?: string;
  emptyText?: string;
  valueSuffix?: string;
}) {
  const max = items.reduce((a, i) => Math.max(a, i.value), 0) || 1;
  if (items.length === 0) {
    return <p className="py-6 text-center text-xs text-[var(--text-muted)]">{emptyText}</p>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => {
        const w = (it.value / max) * 100;
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="min-w-0 text-sm text-[var(--text)] truncate">{it.label}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums nums" style={{ color }}>
                {it.value.toLocaleString()}
                {valueSuffix && <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">{valueSuffix}</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
            </div>
            {it.secondary && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{it.secondary}</p>}
          </>
        );
        return it.href ? (
          <Link key={it.key} prefetch={false} href={it.href} className="block rounded-lg -mx-1 px-1 py-0.5 hover:bg-[var(--surface-2)] transition-colors">
            {inner}
          </Link>
        ) : (
          <div key={it.key}>{inner}</div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * StockBarList — ranked list of stocks with company name + link.
 * ------------------------------------------------------------------ */
export function StockBarList({
  items,
  priceMap,
  color = COLORS.primary,
  valueSuffix,
  emptyText = "No data yet.",
}: {
  items: { code: string; value: number; secondary?: ReactNode }[];
  priceMap: Map<string, ScoreItem>;
  color?: string;
  valueSuffix?: string;
  emptyText?: string;
}) {
  return (
    <BarList
      color={color}
      valueSuffix={valueSuffix}
      emptyText={emptyText}
      items={items.map((it, i) => {
        const name = priceMap.get(it.code.toUpperCase())?.company_name ?? null;
        return {
          key: it.code,
          href: `/stock/${it.code}`,
          value: it.value,
          secondary: it.secondary,
          label: (
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="text-[11px] font-bold text-[var(--text-muted)] w-4 tabular-nums shrink-0">{i + 1}</span>
              <span className="font-mono font-bold text-sm text-[var(--text)] shrink-0">{it.code}</span>
              {name && <span className="text-[11px] text-[var(--text-muted)] truncate">{name}</span>}
            </span>
          ),
        };
      })}
    />
  );
}

/* ------------------------------------------------------------------ *
 * FunnelBars — activation milestones (each bar % of the top step).
 * ------------------------------------------------------------------ */
export function FunnelBars({
  steps,
  showConversion = false,
}: {
  steps: { label: string; count: number; color?: string; hint?: string }[];
  showConversion?: boolean;
}) {
  const top = steps[0]?.count || 1;
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const pctOfTop = (s.count / top) * 100;
        const prev = i > 0 ? steps[i - 1].count : s.count;
        const conv = prev > 0 ? Math.round((s.count / prev) * 100) : 0;
        const color = s.color ?? COLORS.primary;
        return (
          <div key={s.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm text-[var(--text)] flex items-center gap-1.5">
                {s.label}
                {s.hint && <span className="text-[var(--text-muted)] cursor-help" title={s.hint}>ⓘ</span>}
              </span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                <span className="font-bold text-[var(--text)] text-sm">{s.count.toLocaleString()}</span>
                <span className="ml-1.5">{Math.round(pctOfTop)}%</span>
                {showConversion && i > 0 && <span className="ml-1.5 text-[10px]">({conv}% of prev)</span>}
              </span>
            </div>
            <div className="h-6 rounded-lg bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full rounded-lg transition-all"
                style={{ width: `${Math.max(pctOfTop, 2)}%`, background: color, opacity: 0.85 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * CohortGrid — weekly retention triangle. Cells shaded by % retained.
 * ------------------------------------------------------------------ */
export function CohortGrid({
  rows,
}: {
  rows: { cohort: string; size: number; cells: { week: number; pct: number; count: number }[] }[];
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-[var(--text-muted)]">Not enough signup history yet.</p>;
  }
  const maxWeek = rows.reduce((a, r) => Math.max(a, r.cells.length - 1), 0);
  const weekLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };
  const shade = (pct: number) => {
    // positive-green wash whose alpha scales with retention
    const a = Math.max(0.06, Math.min(pct / 100, 1) * 0.9);
    return `color-mix(in srgb, ${COLORS.positive} ${Math.round(a * 100)}%, transparent)`;
  };
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full border-separate" style={{ borderSpacing: "3px" }}>
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold px-2 whitespace-nowrap">
              Signup week
            </th>
            {Array.from({ length: maxWeek + 1 }, (_, w) => (
              <th key={w} className="text-[10px] text-[var(--text-muted)] font-semibold tabular-nums w-11">
                W{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cohort}>
              <td className="px-2 whitespace-nowrap">
                <span className="text-xs font-semibold text-[var(--text)]">{weekLabel(r.cohort)}</span>
                <span className="ml-1.5 text-[10px] text-[var(--text-muted)] tabular-nums">n={r.size}</span>
              </td>
              {Array.from({ length: maxWeek + 1 }, (_, w) => {
                const cell = r.cells.find((c) => c.week === w);
                if (!cell) return <td key={w} />;
                return (
                  <td
                    key={w}
                    className="text-center rounded-md h-9 align-middle"
                    style={{ background: shade(cell.pct) }}
                    title={`${cell.count} of ${r.size} active in week ${w}`}
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-[var(--text)]">
                      {cell.pct}%
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * HoursHeatmap — weekday × hour activity grid (Dhaka time).
 * ------------------------------------------------------------------ */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HoursHeatmap({ matrix, max }: { matrix: number[][]; max: number }) {
  if (!max) {
    return <p className="py-6 text-center text-xs text-[var(--text-muted)]">No tracked activity yet.</p>;
  }
  const shade = (v: number) => {
    if (!v) return "var(--surface-2)";
    const a = Math.max(0.1, (v / max) * 0.92);
    return `color-mix(in srgb, ${COLORS.primary} ${Math.round(a * 100)}%, transparent)`;
  };
  const fmtHour = (h: number) => (h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`);
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="border-separate" style={{ borderSpacing: "2px" }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="text-[9px] text-[var(--text-muted)] font-medium tabular-nums w-6 text-center">
                {h % 3 === 0 ? fmtHour(h) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, d) => (
            <tr key={d}>
              <td className="text-[10px] text-[var(--text-muted)] font-semibold pr-1.5 text-right whitespace-nowrap">
                {WEEKDAYS[d]}
              </td>
              {row.map((v, h) => (
                <td
                  key={h}
                  className="w-6 h-5 rounded"
                  style={{ background: shade(v) }}
                  title={`${WEEKDAYS[d]} ${fmtHour(h)} — ${v.toLocaleString()} views`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
