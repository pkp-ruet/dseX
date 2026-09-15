"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { money } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StarButton from "@/components/ui/StarButton";

const INITIAL = 6;

/** Followed first, then Strong, then by fundamental score. */
function order(list: ScoreItem[], followed: Set<string>): ScoreItem[] {
  return [...list].sort(
    (a, b) =>
      Number(followed.has(b.trading_code.toUpperCase())) - Number(followed.has(a.trading_code.toUpperCase())) ||
      Number(b.signal?.strength === "strong") - Number(a.signal?.strength === "strong") ||
      (b.score ?? -1) - (a.score ?? -1),
  );
}

/**
 * Every whole-market Buy signal of the day as a plain list: company name, the
 * one-sentence reason in the reader's language, today's price, a star to
 * follow. Six rows show; "Show all N" opens the rest. The count sentence at
 * the top is the headline.
 */
export default function BuysTodayCard({
  buys,
  held,
  watched,
  lang = "en",
}: {
  buys: ScoreItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  const followed = new Set([...held, ...watched]);
  const rows = order(buys, followed);
  const shown = open ? rows : rows.slice(0, INITIAL);
  const count = rows.length;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        title={t(lang, "buysTitle")}
        chips={count > 0 ? <HeaderChip tone="accent">{count}</HeaderChip> : undefined}
        href="/buy-sell-signals"
        linkLabel={t(lang, "allBuys")}
      />
      <div className="px-4 pt-3 sm:px-5">
        <p className="text-[0.95rem] font-bold leading-snug text-[var(--text)]">
          {count === 0 ? t(lang, "buysNone") : count === 1 ? t(lang, "buysOne") : t(lang, "buysCount", { n: count })}
        </p>
        <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--text-muted)]">{t(lang, "buysNote")}</p>
      </div>

      {shown.length > 0 && (
        <ul className="mt-2 divide-y divide-[var(--cell-rule)]">
          {shown.map((s) => {
            const strong = s.signal?.strength === "strong";
            const reason = (bn ? s.signal?.reason_bn : s.signal?.reason_en) || s.signal?.reason_en || "";
            const chg = s.change_pct;
            const chgColor = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
            return (
              <li key={s.trading_code} className="flex items-stretch gap-1 px-4 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5">
                <Link prefetch={false} href={`/stock/${s.trading_code}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">
                        {s.company_name ?? s.trading_code}
                      </span>
                      <span className="shrink-0 font-mono text-[0.68rem] font-bold tracking-wide text-[var(--text-muted)]">{s.trading_code}</span>
                      <OwnerMark code={s.trading_code} held={held} watched={watched} lang={lang} />
                      {strong && (
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em]"
                          style={{ color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 14%, transparent)" }}
                        >
                          {t(lang, "strongTag")}
                        </span>
                      )}
                    </span>
                    {reason && <span className="mt-0.5 block text-[0.78rem] leading-snug text-[var(--text-muted)] line-clamp-2">{reason}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[0.86rem] font-bold tabular-nums nums text-[var(--text)]">{money(s.ltp)}</span>
                    {chg != null && (
                      <span className="block text-[0.75rem] font-semibold tabular-nums nums" style={{ color: chgColor }}>
                        {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
                      </span>
                    )}
                  </span>
                </Link>
                <span className="flex items-center">
                  <StarButton code={s.trading_code} size="sm" className="shrink-0" />
                </span>
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
    </section>
  );
}
