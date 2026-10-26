"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ScreenerGoal, ScreenerSaved } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { usePremium } from "@/lib/premium";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";

const DEFAULT_GOAL = "good_cheap";

/**
 * "Find stocks your way" — the screener on both homepages (2026-10-26): a
 * grid of goal tiles (two across on a phone), each with today's pass count; the chosen goal's top
 * three below; one link into `/screener` with that goal started. The goals
 * use no power checks and three rows are the screener's free share, so the
 * card is fully open — the lock only appears on the screener, past row three.
 *
 * Premium readers with saved screens get them on top: each screen's count at
 * the last daily check and who joined then (also an AttentionStrip row).
 *
 * Server render = the default goal, so the landing page's HTML has real rows.
 */
export default function ScreenerCard({
  goals,
  saved = [],
  held,
  watched,
  lang = "en",
}: {
  goals: ScreenerGoal[] | null | undefined;
  saved?: ScreenerSaved[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const tx = (en: string, b: string) => (bn ? b : en);
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = goals ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  if (!list.length) return null;
  const goal = list.find((g) => g.id === picked) ?? list.find((g) => g.id === DEFAULT_GOAL) ?? list[0];
  const screens = mounted && isPremium ? saved.slice(0, 3) : [];
  const href = `/screener?start=${encodeURIComponent(goal.id)}`;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "screenerTitle")} href="/screener" linkLabel={t(lang, "screenerOpen")} />

      {screens.length > 0 && (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="mb-1 text-xs font-semibold text-text-muted">{t(lang, "screenerYours")}</p>
          <ul className="divide-y divide-cell-rule">
            {screens.map((s) => (
              <li key={s.id}>
                <Link
                  prefetch={false}
                  href={`/screener?tab=saved&list=${encodeURIComponent(s.id)}`}
                  className="flex min-h-10 items-center justify-between gap-3 py-2 hover:text-primary active:opacity-70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-text-main">{s.name}</span>
                    {s.new_today.length > 0 && (
                      <span className="block truncate text-xs text-text-muted">
                        {s.new_today.slice(0, 3).map((x) => x.code).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 text-sm tabular-nums ${s.new_today.length ? "font-semibold text-primary-ink" : "text-text-muted"}`}>
                    {s.new_today.length
                      ? t(lang, "screenerNew", { n: s.new_today.length })
                      : s.passed != null ? t(lang, "screenerPass", { n: s.passed }) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Goals: a plain grid of tiles — two across on a phone, three from
          640px — so every goal and its count is in view, nothing to swipe.
          (It was the dashboard's swipe rail, which clipped chips at a phone's
          edge and turns into 15rem grid columns on a mouse screen.) */}
      <ul className="grid grid-cols-2 gap-2 px-4 pt-3 sm:grid-cols-3 sm:px-5" aria-label={t(lang, "screenerTitle")}>
        {list.map((g) => {
          const on = g.id === goal.id;
          return (
            <li key={g.id} className="min-w-0">
              <button
                type="button"
                onClick={() => setPicked(g.id)}
                aria-pressed={on}
                className={`flex h-full min-h-14 w-full flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors active:bg-surface-2 ${
                  on ? "border-text-main bg-surface-2" : "border-border bg-surface hover:border-text-muted"
                }`}
              >
                <span className="text-sm font-semibold leading-snug text-text-main">{tx(g.title_en, g.title_bn)}</span>
                <span className="text-xs tabular-nums text-text-muted">{t(lang, "screenerPass", { n: g.passed })}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="px-4 pt-3 text-sm text-text-muted sm:px-5">{tx(goal.blurb_en, goal.blurb_bn)}</p>

      {goal.top.length > 0 ? (
        <ul className="mt-1 divide-y divide-cell-rule">
          {goal.top.map((s) => (
            <StockRow
              key={s.code}
              inset="card"
              code={s.code}
              name={s.name}
              price={s.price}
              change={s.change_pct}
              mark={<OwnerMark code={s.code} held={held} watched={watched} lang={lang} />}
              sub={s.checks.map((c) => tx(c.value_en, c.value_bn)).join(" · ")}
              subClamp
              // On a phone the name, its figures and the price need the whole
              // row; the Buy chip joins beside the name from 640px (a hidden
              // `tags` item takes no gap, a hidden `trailing` slot would).
              tags={s.signal !== "none" ? <span className="hidden sm:inline-flex"><SignalChip signal={s.signal} size="sm" /></span> : undefined}
              lang={lang}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-text-muted sm:px-5">{t(lang, "screenerNone")}</p>
      )}

      <Link
        prefetch={false}
        href={href}
        className="flex min-h-12 items-center justify-center border-t border-border px-4 text-sm font-semibold text-primary-ink hover:bg-surface-2 active:bg-surface-2 sm:justify-start sm:px-5"
      >
        {goal.passed > goal.top.length ? t(lang, "screenerSeeAll", { n: goal.passed }) : t(lang, "screenerChange")} →
      </Link>
    </section>
  );
}
