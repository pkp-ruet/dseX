"use client";

import { useState } from "react";
import Link from "next/link";
import type { ForYou, ForYouItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { formatDate } from "@/lib/formatters";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import ForYouFunnel from "@/components/home/personalized/ForYouFunnel";
import ForYouPromo from "@/components/home/personalized/ForYouPromo";
import RecoRow from "@/components/reco/RecoRow";
import { StockRowSkeleton } from "@/components/ui/StockRow";
import { IconCheck, IconChevronDown, IconSparkle } from "@/components/ui/icons";

/** The picks shown in full; the rest are compact rows behind "See all". */
const TOP = 3;

/**
 * "Picked for you" — the recommendation engine's list, the first block of the
 * dashboard's Find stocks chapter.
 *
 * Premium since 2026-11-01 (user: "everything of Picked for you will be a
 * premium feature"): a free reader gets `ForYouPromo` — what the engine did
 * for them in counts, what the list shows, one button — and never a company.
 *
 * The Premium view reads like a short personal note: who it is for, the
 * three numbers behind it (analysed → passed → chosen), what it was matched
 * to, then the top three in full (reason, number lines, one watch-out) and
 * the rest as compact rows behind "See all". "How we pick" closes the card.
 * No link out to another page: the card is the feature.
 */
export default function ForYouCard({
  data,
  loading,
  premium,
  name,
  held,
  watched,
  lang = "en",
}: {
  data: ForYou | null | undefined;
  loading: boolean;
  premium: boolean;
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
    <p className="fy-eyebrow">
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

  if (!premium) return data.items.length > 0 ? <ForYouPromo data={data} name={name} lang={lang} /> : null;

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

  const top = data.items.slice(0, TOP);
  const rest = data.items.slice(TOP);
  const mark = (it: ForYouItem) => <OwnerMark code={it.code} held={held} watched={watched} lang={lang} />;

  return (
    <section className={`soft-card fy ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <div className="fy-head">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {eyebrow}
          <p className="text-xs text-text-muted">
            {data.new > 0 && <span className="font-semibold text-positive">{t(lang, "forYouNewToday", { n: data.new })}</span>}
            {data.new > 0 && data.as_of && " · "}
            {data.as_of && t(lang, "forYouUpdated", { d: formatDate(data.as_of) })}
          </p>
        </div>
        <h3 className="fy-title">{headline}</h3>
        <p className="fy-lead">{lead}</p>

        {data.funnel.rated > 0 && <ForYouFunnel data={data} lang={lang} />}

        {personal && data.traits.length > 0 && (
          <p className="fy-traits">
            <span>{t(lang, "forYouTraits")}</span> {data.traits.map((x) => tx(x.en, x.bn)).join(" · ")}
          </p>
        )}

        {/* Make it theirs: no stocks yet → two doors; one or two → follow a few more. */}
        {stocks === 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link prefetch={false} href="/watchlist" className="btn-primary btn-sm">
              {t(lang, "forYouAddWatchlist")}
            </Link>
            <Link prefetch={false} href="/portfolio" className="btn-quiet btn-sm">
              {t(lang, "forYouAddPortfolio")}
            </Link>
          </div>
        ) : stocks < 3 ? (
          <p className="mt-3 text-sm">
            <Link prefetch={false} href="/watchlist" className="font-semibold text-primary-ink hover:underline">
              {t(lang, "forYouNudgeFew")} →
            </Link>
          </p>
        ) : null}

        {data.note && <p className="mt-3 text-sm text-text-main">{tx(data.note.en, data.note.bn)}</p>}
      </div>

      {top.length > 0 && (
        <>
          <p className="fy-label">{t(lang, "forYouTop")}</p>
          <ol className="divide-y divide-cell-rule">
            {top.map((it, i) => (
              <RecoRow key={it.code} item={it} rich rank={i + 1} mark={mark(it)} lang={lang} />
            ))}
          </ol>
        </>
      )}

      {rest.length > 0 && more && (
        <>
          <p className="fy-label">{t(lang, "forYouAlso")}</p>
          <ol className="divide-y divide-cell-rule">
            {rest.map((it, i) => (
              <RecoRow key={it.code} item={it} rank={TOP + i + 1} mark={mark(it)} lang={lang} />
            ))}
          </ol>
        </>
      )}

      {rest.length > 0 && (
        <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="fy-more">
          {more ? t(lang, "forYouSeeFewer") : t(lang, "forYouSeeMore", { n })}
          <span className={`transition-transform ${more ? "rotate-180" : ""}`} aria-hidden="true">
            <IconChevronDown size={16} />
          </span>
        </button>
      )}

      <details className="group border-t border-border px-4 sm:px-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-text-main">
          {t(lang, "forYouHow")}
          <span className="transition-transform group-open:rotate-180" aria-hidden="true">
            <IconChevronDown size={16} />
          </span>
        </summary>
        <div className="space-y-2 pb-4 text-sm text-text-main">
          <p>{t(lang, "forYouHowChecks")}</p>
          <ul className="space-y-1.5">
            {data.funnel.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-positive" aria-hidden="true">
                  <IconCheck size={14} />
                </span>
                <span className="min-w-0 flex-1">{tx(c.en, c.bn)}</span>
                <span className="shrink-0 tabular-nums">{c.left}</span>
              </li>
            ))}
          </ul>
          <p>{t(lang, "forYouHowRank")}</p>
          <p>{t(lang, "forYouHowNever")}</p>
          <p className="text-xs">{t(lang, "forYouNotAdvice")}</p>
        </div>
      </details>
    </section>
  );
}
