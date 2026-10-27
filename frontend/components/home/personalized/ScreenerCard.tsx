"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ScreenerGoal, ScreenerSaved } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { usePremium } from "@/lib/premium";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import Chip from "@/components/ui/Chip";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";

const DEFAULT_GOAL = "good_cheap";

/**
 * "Find stocks your way" — the screener on both homepages, in the screener's
 * own look (2026-10-27): the quick picks as one chip row; under it what the
 * chosen pick asks, as the screener's questions and answers ("Is the price
 * low? · Low"); the pass count; the top three with their strength line
 * ("Very good company · Low price · Pays every year"); then what sits past
 * them as counts ("Among the other 22 · 16 have a Buy signal · 14 marked
 * 'Pays 4%+ a year' · 2 you follow") and one link into `/screener` with that
 * pick started. Picks use no power checks and three rows are the screener's
 * free share, so the card is fully open — the lock lives on the screener.
 *
 * Premium readers with saved screens get them on top: each screen's count at
 * the last daily check and who joined then (also a key point in "Your stocks today").
 *
 * Server render = the default pick, so the landing page's HTML has real rows.
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
  const tx = (en: string, b: string) => <T en={en} bn={b} />;
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = goals ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  if (!list.length) return null;
  const goal = list.find((g) => g.id === picked) ?? list.find((g) => g.id === DEFAULT_GOAL) ?? list[0];
  const screens = mounted && isPremium ? saved.slice(0, 3) : [];
  const href = `/screener?start=${encodeURIComponent(goal.id)}`;

  // What's past the top three, as counts.
  const hidden = goal.hidden;
  const mine = (goal.hidden_codes ?? []).filter((c) => held.has(c) || watched.has(c)).length;
  const hiddenBits = hidden && hidden.count > 0
    ? [
        hidden.buys ? tt("screenerBuys", { n: hidden.buys }) : null,
        hidden.strength
          ? (
              <T
                en={t("en", "screenerMarked", { n: hidden.strength.n, tag: hidden.strength.en })}
                bn={t("bn", "screenerMarked", { n: hidden.strength.n, tag: hidden.strength.bn })}
              />
            )
          : null,
        mine ? tt("screenerFollow", { n: mine }) : null,
      ].filter((x): x is React.JSX.Element => !!x)
    : [];

  return (
    <section className="soft-card overflow-hidden">
      <DashHeader
        title={tt("screenerTitle")}
        sub={tt("screenerSub")}
        href="/screener"
        linkLabel={tt("screenerOpen")}
      />

      {screens.length > 0 && (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <p className="mb-1 text-xs font-semibold text-text-muted">{tt("screenerYours")}</p>
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
                      ? tt("screenerNew", { n: s.new_today.length })
                      : s.passed != null ? tt("screenerPass", { n: s.passed }) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick picks — the same chip row the screener opens with. */}
      <div className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5" role="group" aria-label={t(lang, "screenerTitle")}>
        {list.map((g) => (
          <Chip key={g.id} active={g.id === goal.id} onClick={() => setPicked(g.id)}>
            {tx(g.title_en, g.title_bn)}
          </Chip>
        ))}
      </div>

      {/* What the pick asks, as the screener's questions and answers. */}
      {goal.wants && goal.wants.length > 0 ? (
        <div className="px-4 pt-3 sm:px-5">
          <p className="mb-1.5 text-xs font-semibold text-text-muted">{tt("screenerAsks")}</p>
          <ul className="overflow-hidden rounded-lg border border-border">
            {goal.wants.map((w) => (
              <li key={w.key} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
                <span className="min-w-0 text-sm text-text-muted">{tx(w.q_en, w.q_bn)}</span>
                <span className="shrink-0 rounded-md bg-primary-soft px-2 py-0.5 text-sm font-semibold text-primary">
                  {tx(w.a_en, w.a_bn)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="px-4 pt-3 text-sm text-text-muted sm:px-5">{tx(goal.blurb_en, goal.blurb_bn)}</p>
      )}

      <p className="px-4 pt-4 text-base font-semibold text-text-main sm:px-5">
        {tt("screenerPassToday", { n: goal.passed })}
      </p>

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
              sub={s.strengths?.length
                ? s.strengths.map((x) => tx(x.en, x.bn)).join(" · ")
                : <T en={s.checks.map((c) => c.value_en).join(" · ")} bn={s.checks.map((c) => c.value_bn).join(" · ")} />}
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
        <p className="px-4 py-3 text-sm text-text-muted sm:px-5">{tt("screenerNone")}</p>
      )}

      {hidden && hidden.count > 0 && hiddenBits.length > 0 && (
        <p className="border-t border-border px-4 py-3 text-sm text-text-muted sm:px-5">
          <span className="font-semibold text-text-main">{tt("screenerHidden", { n: hidden.count })}</span>
          {hiddenBits.map((bit, i) => (
            <span key={i}>
              {" · "}
              {bit}
            </span>
          ))}
        </p>
      )}

      <Link
        prefetch={false}
        href={href}
        className="flex min-h-12 items-center justify-center border-t border-border px-4 text-sm font-semibold text-primary-ink hover:bg-surface-2 active:bg-surface-2 sm:justify-start sm:px-5"
      >
        {goal.passed > goal.top.length ? tt("screenerSeeAll", { n: goal.passed }) : tt("screenerChange")} →
      </Link>
    </section>
  );
}
