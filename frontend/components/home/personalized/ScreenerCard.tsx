"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ScreenerReadyCard, ScreenerSaved } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { usePremium } from "@/lib/premium";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import Chip from "@/components/ui/Chip";
import StockRow from "@/components/ui/StockRow";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";

const DEFAULT_SCREEN = "high_dividend";

/**
 * "Find stocks your way" — the screener on the dashboard, in the screener's
 * own look (2026-11-01): the ready-made screens as one chip row; under it the
 * chosen screen's filters in words ("Yield: 5% or more"); the match count; the
 * top three, each with the figure that put it there; then one link into
 * `/screener` with that screen loaded. Every screen is on public figures and
 * every row of the screener is free, so nothing here is locked.
 *
 * Premium readers with saved screens get them on top: each screen's count at
 * the last daily check and who joined then.
 */
export default function ScreenerCard({
  ready,
  saved = [],
  held,
  watched,
  lang = "en",
}: {
  ready: ScreenerReadyCard[] | null | undefined;
  saved?: ScreenerSaved[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const tx = (en: string, b: string) => <T en={en} bn={b} />;
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = ready ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  if (!list.length) return null;
  const screen = list.find((g) => g.id === picked) ?? list.find((g) => g.id === DEFAULT_SCREEN) ?? list[0];
  const screens = mounted && isPremium ? saved.slice(0, 3) : [];
  const href = `/screener?ready=${encodeURIComponent(screen.id)}`;

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

      {/* Ready-made screens — the same chip row the screener opens with. */}
      <div className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5" role="group" aria-label={t(lang, "screenerTitle")}>
        {list.map((g) => (
          <Chip key={g.id} active={g.id === screen.id} onClick={() => setPicked(g.id)}>
            {tx(g.title_en, g.title_bn)}
          </Chip>
        ))}
      </div>

      {/* The screen's filters in words. */}
      <div className="px-4 pt-3 sm:px-5">
        <p className="text-sm text-text-main">{tx(screen.blurb_en, screen.blurb_bn)}</p>
        {screen.words.length > 0 && (
          <>
            <p className="mb-1.5 mt-3 text-xs font-semibold text-text-muted">{tt("screenerAsks")}</p>
            <ul className="flex flex-wrap gap-1.5">
              {screen.words.map((w) => (
                <li key={w.key}><Chip>{tx(w.en, w.bn)}</Chip></li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="px-4 pt-4 text-base font-semibold text-text-main sm:px-5">
        {tt("screenerPassToday", { n: screen.passed })}
      </p>

      {screen.top.length > 0 ? (
        <ul className="mt-1 divide-y divide-cell-rule">
          {screen.top.map((s) => (
            <StockRow
              key={s.code}
              inset="card"
              code={s.code}
              name={s.name}
              price={s.price}
              change={s.change_pct}
              mark={<OwnerMark code={s.code} held={held} watched={watched} lang={lang} />}
              sub={s.metric?.en ? <T en={s.metric.en} bn={s.metric.bn} /> : undefined}
              lang={lang}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-text-muted sm:px-5">{tt("screenerNone")}</p>
      )}

      <Link
        prefetch={false}
        href={href}
        className="flex min-h-12 items-center justify-center border-t border-border px-4 text-sm font-semibold text-primary-ink hover:bg-surface-2 active:bg-surface-2 sm:justify-start sm:px-5"
      >
        {screen.passed > screen.top.length ? tt("screenerSeeAll", { n: screen.passed }) : tt("screenerChange")} →
      </Link>
    </section>
  );
}
