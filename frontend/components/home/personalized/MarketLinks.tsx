import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/context/LangContext";
import type { HomeBundle } from "@/lib/api";
import { t } from "@/lib/home-copy";
import { RESULT_LEVEL_ORDER } from "@/lib/results";
import { IconArrowRight, IconChartBars, IconNews } from "@/components/ui/icons";

type Week = NonNullable<HomeBundle["results_week"]>;

interface Item {
  href: string;
  icon: ReactNode;
  title: "dseTodayLink";
  sub: "dseTodayLinkSub";
}

// One market page since 2026-11-05 (DSE today, Market analysis and the Bengali
// daily page merged into /dse-today), so one tile.
const ITEMS: Item[] = [
  { href: "/dse-today", icon: <IconChartBars size={18} />, title: "dseTodayLink", sub: "dseTodayLinkSub" },
];

const TILE =
  "soft-card group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:border-primary active:bg-surface-2";

function TileIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-main">
      {children}
    </span>
  );
}

function TileArrow() {
  return (
    <span className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
      <IconArrowRight size={16} />
    </span>
  );
}

/** "12 companies · 5 better · 4 weaker" (Better and Weaker only when there are some). */
function weekLine(week: Week, lang: Lang): string {
  const bn = lang === "bn";
  const good = week.counts.good ?? 0;
  const bad = week.counts.bad ?? 0;
  const parts = [
    bn ? `${week.recent}টি কোম্পানি` : `${week.recent} ${week.recent === 1 ? "company" : "companies"}`,
  ];
  if (good > 0) parts.push(bn ? `${good}টি ভালো` : `${good} better`);
  if (bad > 0) parts.push(bn ? `${bad}টি দুর্বল` : `${bad} weaker`);
  return parts.join(" · ");
}

/**
 * The Market today chapter's way out: quiet link tiles to the market page
 * (`/dse-today`, "Market today") and, since 2026-11-04, the week's results
 * (`/results`). Neutral icon tile, title,
 * one line, arrow — no colour except the results tile's split bar.
 *
 * The results tile replaced the full `ResultsPromoCard` (user: it took a lot
 * of room on the homepage): "Results this week" + "12 companies · 5 better ·
 * 4 weaker" + the week's split as one thin bar (the /results page's four
 * level colours). A quiet week says how many companies have results instead.
 * Side by side from 640px.
 */
export default function MarketLinks({ lang, results = null }: { lang: Lang; results?: Week | null }) {
  const bn = lang === "bn";
  const week = results && results.total > 0 ? results : null;
  const split = week && week.recent > 0 ? RESULT_LEVEL_ORDER.filter((lv) => (week.counts[lv] ?? 0) > 0) : [];

  return (
    <nav
      aria-label={t(lang, "chMarket")}
      className={`grid grid-cols-1 gap-3 ${week ? "sm:grid-cols-2" : ""}`}
    >
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className={TILE}>
          <TileIcon>{it.icon}</TileIcon>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-main">{t(lang, it.title)}</span>
            <span className="block text-xs text-text-muted">{t(lang, it.sub)}</span>
          </span>
          <TileArrow />
        </Link>
      ))}
      {week && (
        <Link href="/results" className={TILE} data-card="results-promo">
          <TileIcon>
            <IconNews size={18} />
          </TileIcon>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-main">
              {t(lang, week.recent > 0 ? "resultsLinkWeek" : "resultsLink")}
            </span>
            <span className="block text-xs text-text-muted">
              {week.recent > 0
                ? weekLine(week, lang)
                : bn
                  ? `${week.total}টি কোম্পানির সর্বশেষ ফল`
                  : `The latest results of ${week.total} companies`}
            </span>
            {split.length > 0 && (
              <span className="rs-split rs-split--thin mt-1.5" aria-hidden="true">
                {split.map((lv) => (
                  <span key={lv} className={`rs-lv--${lv}`} style={{ width: `${(week.counts[lv] / week.recent) * 100}%` }} />
                ))}
              </span>
            )}
          </span>
          <TileArrow />
        </Link>
      )}
    </nav>
  );
}
