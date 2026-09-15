"use client";

import { useState } from "react";
import Link from "next/link";
import type { CorporateActionEvent } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconCoin } from "@/components/home/personalized/DashIcons";

const INITIAL = 6;
const DECLARED_ROWS = 3;

function fmtDate(iso: string | null | undefined, bn: boolean): string {
  if (!iso) return "";
  return bn ? bnDate(iso) : formatDate(iso);
}

function fmtCash(v: number): string {
  return `৳${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
}

/**
 * "Money coming": every record date inside the next two weeks, market-wide,
 * with the cash per share, the yield on today's price, the record date with
 * days left, and the last day to buy so the dividend lands on you. Then the
 * latest declarations. The reader's own stocks wear the H / ★ marks.
 */
export default function DividendBoardCard({
  recordDates,
  declared,
  held,
  watched,
  lang = "en",
}: {
  recordDates: CorporateActionEvent[];
  declared: CorporateActionEvent[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  const rows = recordDates.filter((e) => !e.is_no_dividend);
  const shown = open ? rows : rows.slice(0, INITIAL);
  const decl = declared.filter((e) => !e.is_no_dividend).slice(0, DECLARED_ROWS);
  if (rows.length === 0 && decl.length === 0) return null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.gold} icon={<IconCoin size={15} />}
        title={t(lang, "divBoardTitle")}
        chips={rows.length > 0 ? <HeaderChip tone="accent">{rows.length}</HeaderChip> : undefined}
        href="/dividend-calendar"
        linkLabel={t(lang, "fullCalendar")}
      />

      {rows.length === 0 ? (
        <p className="px-4 py-3 text-[0.8rem] text-[var(--text-muted)] sm:px-5">{t(lang, "noDividendSoon")}</p>
      ) : (
        <ul className="divide-y divide-[var(--cell-rule)]">
          {shown.map((e) => {
            const days = e.record_days_left;
            const daysStr = days == null ? "" : days <= 0 ? t(lang, "todayLast") : days === 1 ? t(lang, "oneDayLeft") : t(lang, "daysLeft", { n: days });
            const urgent = days != null && days <= 3;
            const cash = e.cash_per_share;
            const line2 =
              cash != null && cash > 0
                ? `${fmtCash(cash)} ${t(lang, "perShare")}${e.yield_pct != null ? ` · ${e.yield_pct.toFixed(1)}% ${t(lang, "yieldWord")}` : ""}`
                : e.stock_pct != null && e.stock_pct > 0
                  ? t(lang, "bonus", { n: e.stock_pct })
                  : e.cash_pct != null
                    ? t(lang, "cashPct", { n: e.cash_pct })
                    : "";
            return (
              <li key={`${e.trading_code}-${e.record_date}`}>
                <Link
                  prefetch={false}
                  href={`/stock/${e.trading_code}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: "var(--watch)", background: "color-mix(in srgb, var(--watch) 14%, transparent)" }} aria-hidden>
                    <IconCoin size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">{e.company_name ?? e.trading_code}</span>
                      <OwnerMark code={e.trading_code} held={held} watched={watched} lang={lang} />
                    </span>
                    <span className="mt-0.5 block text-[0.78rem] font-semibold tabular-nums nums" style={{ color: "var(--warm-ink)" }}>
                      {line2}
                    </span>
                    {e.buy_by && (
                      <span className="block text-[0.72rem] text-[var(--text-muted)]">{t(lang, "buyBy", { date: fmtDate(e.buy_by, bn) })}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[0.78rem] font-semibold text-[var(--text)]">{fmtDate(e.record_date, bn)}</span>
                    {daysStr && (
                      <span className="block text-[0.72rem] font-bold tabular-nums nums" style={{ color: urgent ? "var(--negative)" : "var(--text-muted)" }}>
                        {daysStr}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > INITIAL && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block w-full border-t border-[var(--border)] px-4 py-2.5 text-center text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
        >
          {open ? t(lang, "showFewer") : t(lang, "showAll", { n: rows.length })}
        </button>
      )}

      {decl.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <h3 className="px-4 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:px-5">{t(lang, "justDeclared")}</h3>
          <ul className="mt-1 divide-y divide-[var(--cell-rule)]">
            {decl.map((e) => {
              const parts: string[] = [];
              if (e.cash_pct != null && e.cash_pct > 0) parts.push(t(lang, "cashPct", { n: e.cash_pct }));
              if (e.stock_pct != null && e.stock_pct > 0) parts.push(t(lang, "bonus", { n: e.stock_pct }));
              return (
                <li key={`${e.trading_code}-${e.declaration_date}`}>
                  <Link
                    prefetch={false}
                    href={`/stock/${e.trading_code}`}
                    className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[0.86rem] font-bold leading-tight text-[var(--text)]">{e.company_name ?? e.trading_code}</span>
                        <OwnerMark code={e.trading_code} held={held} watched={watched} lang={lang} />
                      </span>
                      <span className="block text-[0.72rem] text-[var(--text-muted)]">
                        {e.declaration_date ? t(lang, "declaredOn", { date: fmtDate(e.declaration_date, bn) }) : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.8rem] font-bold tabular-nums nums" style={{ color: "var(--warm-ink)" }}>
                      {parts.join(" + ")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
