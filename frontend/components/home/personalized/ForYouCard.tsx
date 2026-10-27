"use client";

import { useState } from "react";
import Link from "next/link";
import type { ForYou, ForYouItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { FREE_FORYOU_ROWS, splitFree } from "@/lib/free-share";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import PremiumGate from "@/components/premium/PremiumGate";
import RecoRow from "@/components/reco/RecoRow";
import Stat from "@/components/ui/Stat";
import { StockPill, StockRowSkeleton } from "@/components/ui/StockRow";
import { IconCheck, IconChevronDown, IconSparkle } from "@/components/ui/icons";

/** Kinds that name one of the reader's own stocks (the lock's stakes count them). */
const TIED = new Set(["add_more", "watched", "upgrade", "similar"]);

/**
 * "Picked for you" (2026-10-28) — the recommendation engine's list, the first
 * block of the dashboard's Find stocks chapter.
 *
 * Reads top to bottom like a short personal note: a small "Picked for you"
 * line, a headline that speaks to the reader by name ("Rahim, these 15 stocks
 * fit you best today"), one line on why they can trust it, then three numbers
 * — companies checked, how many passed every check, how many were picked. The
 * first `FREE_FORYOU_ROWS` picks are open with their reason, number lines and
 * one watch-out; the rest wait behind "See N more picks" (for a free reader
 * that opens them blurred behind one lock with their own stakes —
 * screen-only, like every lock). "How we pick" closes the card.
 *
 * No link out to the Buy-signals page (user decision 2026-10-28): the card is
 * the feature, not a doorway.
 */
export default function ForYouCard({
  data,
  loading,
  name,
  held,
  watched,
  lang = "en",
}: {
  data: ForYou | null | undefined;
  loading: boolean;
  /** The reader's display name; the headline uses the first word of it. */
  name?: string | null;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const tx = (en: string, b: string) => (bn ? b : en);
  const [more, setMore] = useState(false);

  const eyebrow = (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-ink">
      <IconSparkle size={14} />
      {t(lang, "forYouEyebrow")}
    </p>
  );

  if (!data) {
    if (!loading) return null;
    return (
      <section className="soft-card overflow-hidden" aria-busy="true">
        <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">{eyebrow}</div>
        <ul className="divide-y divide-cell-rule border-t border-cell-rule">
          <StockRowSkeleton rows={3} />
        </ul>
      </section>
    );
  }

  const personal = data.mode === "personal";
  const n = data.items.length;
  const first = (name ?? "").trim().split(/\s+/)[0] || "";
  const { held: nHeld, watched: nWatched } = data.based_on;
  const stocks = nHeld + nWatched;

  const headline = personal
    ? t(lang, first ? "forYouHeadPersonalName" : "forYouHeadPersonal", { name: first, n })
    : t(lang, first ? "forYouHeadGenericName" : "forYouHeadGeneric", { name: first, n });
  const basis = nHeld && nWatched
    ? t(lang, "forYouBasisBoth", { held: nHeld, watched: nWatched })
    : nHeld
      ? t(lang, "forYouBasisHeld", { n: nHeld })
      : t(lang, "forYouBasisWatched", { n: nWatched });
  const lead = personal ? t(lang, "forYouLeadPersonal", { basis }) : t(lang, "forYouLeadGeneric");

  const [open, rest] = splitFree(data.items, FREE_FORYOU_ROWS);
  const mark = (it: ForYouItem) => <OwnerMark code={it.code} held={held} watched={watched} lang={lang} />;

  const tied = rest.filter((it) => TIED.has(it.kind)).length;
  const strong = rest.filter((it) => it.strong).length;
  const stakes = [
    { en: t("en", "forYouStakesMore", { n: rest.length }), bn: t("bn", "forYouStakesMore", { n: rest.length }) },
    ...(tied ? [{ en: t("en", "forYouStakesMine", { n: tied }), bn: t("bn", "forYouStakesMine", { n: tied }) }] : []),
    ...(strong ? [{ en: t("en", "forYouStakesStrong", { n: strong }), bn: t("bn", "forYouStakesStrong", { n: strong }) }] : []),
  ];

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      {/* A short personal note: who it is for, and why it can be trusted. */}
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center justify-between gap-3">
          {eyebrow}
          {data.new > 0 && <StockPill tone="positive">{t(lang, "forYouNewToday", { n: data.new })}</StockPill>}
        </div>
        <h3 className="mt-2 text-xl font-bold leading-snug text-text-main">{headline}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{lead}</p>
      </div>

      {/* The three numbers behind the list. */}
      {data.funnel.rated > 0 && (
        <div className="mx-4 mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border sm:mx-5">
          <Stat value={data.funnel.rated} label={t(lang, "forYouStatChecked")} size="sm" className="px-3 py-2.5" />
          <Stat value={data.funnel.passed} label={t(lang, "forYouStatPassed")} size="sm" className="px-3 py-2.5" />
          <Stat value={n} label={t(lang, "forYouStatPicked")} size="sm" tone="primary" className="px-3 py-2.5" />
        </div>
      )}

      {personal && data.traits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 sm:px-5">
          <span className="text-xs text-text-muted">{t(lang, "forYouTraits")}</span>
          {data.traits.map((x) => (
            <StockPill key={x.key} tone="primary">
              {tx(x.en, x.bn)}
            </StockPill>
          ))}
        </div>
      )}

      {/* Make it theirs: no stocks yet → two doors; one or two → follow a few more. */}
      {stocks === 0 ? (
        <div className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5">
          <Link prefetch={false} href="/watchlist" className="btn-primary btn-sm">
            {t(lang, "forYouAddWatchlist")}
          </Link>
          <Link prefetch={false} href="/portfolio" className="btn-quiet btn-sm">
            {t(lang, "forYouAddPortfolio")}
          </Link>
        </div>
      ) : stocks < 3 ? (
        <p className="px-4 pt-3 text-sm sm:px-5">
          <Link prefetch={false} href="/watchlist" className="font-semibold text-primary-ink hover:underline">
            {t(lang, "forYouNudgeFew")} →
          </Link>
        </p>
      ) : null}

      {data.note && <p className="px-4 pt-3 text-sm text-text-muted sm:px-5">{tx(data.note.en, data.note.bn)}</p>}

      {open.length > 0 && (
        <ol className="mt-4 divide-y divide-cell-rule border-t border-cell-rule">
          {open.map((it, i) => (
            <RecoRow key={it.code} item={it} rich rank={i + 1} mark={mark(it)} lang={lang} />
          ))}
        </ol>
      )}

      {rest.length > 0 && more && (
        <div className="border-t border-cell-rule">
          <PremiumGate
            label={{ en: t("en", "forYouLockLabel"), bn: t("bn", "forYouLockLabel") }}
            preview="blur"
            peek={170}
            stakes={stakes}
          >
            <ol className="divide-y divide-cell-rule">
              {rest.map((it, i) => (
                <RecoRow key={it.code} item={it} rank={open.length + i + 1} mark={mark(it)} lang={lang} />
              ))}
            </ol>
          </PremiumGate>
        </div>
      )}

      {rest.length > 0 && (
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
          className="flex min-h-12 w-full items-center justify-center gap-1.5 border-t border-border px-4 text-sm font-semibold text-primary-ink hover:bg-surface-2 active:bg-surface-2"
        >
          {more ? t(lang, "forYouSeeFewer") : t(lang, "forYouSeeMore", { n: rest.length })}
          <span className={`transition-transform ${more ? "rotate-180" : ""}`} aria-hidden="true">
            <IconChevronDown size={16} />
          </span>
        </button>
      )}

      <details className="group border-t border-border px-4 sm:px-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-text-muted hover:text-text-main">
          {t(lang, "forYouHow")}
          <span className="transition-transform group-open:rotate-180" aria-hidden="true">
            <IconChevronDown size={16} />
          </span>
        </summary>
        <div className="space-y-2 pb-4 text-sm text-text-main">
          <p className="text-text-muted">{t(lang, "forYouHowChecks")}</p>
          <ul className="space-y-1.5">
            {data.funnel.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-positive" aria-hidden="true">
                  <IconCheck size={14} />
                </span>
                <span className="min-w-0 flex-1">{tx(c.en, c.bn)}</span>
                <span className="shrink-0 tabular-nums text-text-muted">{c.left}</span>
              </li>
            ))}
          </ul>
          <p>{t(lang, "forYouHowRank")}</p>
          <p>{t(lang, "forYouHowNever")}</p>
          <p className="text-text-muted">{t(lang, "forYouNotAdvice")}</p>
        </div>
      </details>
    </section>
  );
}
