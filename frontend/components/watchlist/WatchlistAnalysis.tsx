"use client";

import { useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Bn from "@/components/i18n/Bn";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  flattenTiers,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremesData,
  type DividendsUpcoming,
  type WatchlistMeta,
} from "@/lib/api";
import { changePct, changeTone } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

// Bengali tier words come from the canonical map in lib/constants
// (Numbers inside Bengali prose stay Western — 9, 6.1% — per site convention.)

// ---------------------------------------------------------------------------
// Small building blocks (styles: app/styles/watchlist.css, `wl-*`)
// ---------------------------------------------------------------------------

type Tone = "primary" | "good" | "warn" | "bad";

const TONE_COLOR: Record<Tone, string> = {
  primary: "var(--primary)",
  good: "var(--positive)",
  warn: "var(--watch)",
  bad: "var(--negative)",
};

function CodeChip({ code }: { code: string }) {
  return (
    <Link prefetch={false} href={`/stock/${code}`} className="wl-code-link">
      {code}
    </Link>
  );
}

function inlineList(codes: string[], cap = 3): React.ReactNode {
  const shown = codes.slice(0, cap);
  return (
    <>
      {shown.map((c, i) => (
        <span key={c}>
          <CodeChip code={c} />
          {i < shown.length - 1 ? ", " : ""}
        </span>
      ))}
      {codes.length > cap && (
        <span className="text-text-muted"> and {codes.length - cap} more</span>
      )}
    </>
  );
}

/** One fold inside the "What stands out" card: title + Bengali line + count
 *  is the <summary>; the body opens on tap. Hairlines, no tinted header. */
function Fold({
  title,
  titleBn,
  count,
  countTone,
  children,
}: {
  title: string;
  titleBn: string;
  count?: number;
  countTone?: "good" | "bad";
  children: React.ReactNode;
}) {
  return (
    <details className="wl-fold">
      <summary>
        <div className="min-w-0 flex-1">
          <h3 className="wl-fold-title">{title}</h3>
          <Bn className="wl-fold-bn">{titleBn}</Bn>
        </div>
        {count != null && count > 0 && (
          <span className={`wl-fold-count${countTone ? ` wl-fold-count--${countTone}` : ""}`}>
            {count}
          </span>
        )}
        <svg
          className="wl-fold-chev"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="wl-fold-body">{children}</div>
    </details>
  );
}

/** One story point: tone dot + English sentence + Bengali one-liner below. */
function StoryItem({
  tone,
  label,
  bn,
  children,
}: {
  tone: Tone;
  label: string;
  bn?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="wl-story-dot" style={{ background: TONE_COLOR[tone] }} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-text-main">
          <span className="font-semibold">{label}:</span> {children}
        </p>
        {bn && <Bn className="mt-0.5 text-sm leading-relaxed text-text-muted">{bn}</Bn>}
      </div>
    </li>
  );
}

/** One cell of the hero's answer grid: question, the number, one small line. */
function Answer({
  q,
  qBn,
  children,
  x,
}: {
  q: string;
  qBn: string;
  children: React.ReactNode;
  x?: React.ReactNode;
}) {
  return (
    <div className="wl-answer">
      <p className="wl-answer-q">
        {q} <Bn as="span" className="font-normal">· {qBn}</Bn>
      </p>
      <p className="wl-answer-a">{children}</p>
      {x && <p className="wl-answer-x">{x}</p>}
    </div>
  );
}

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

function TierMix({ counts, total }: { counts: Record<TierKey, number>; total: number }) {
  if (total === 0) return null;
  const shown = TIER_ORDER.filter((t) => counts[t] > 0);
  return (
    <div className="wl-mix">
      <div className="wl-mix-head">
        <p className="wl-mix-title">Quality mix</p>
        <Bn className="text-xs text-text-muted">কোন মানের শেয়ার কয়টা</Bn>
      </div>
      <div className="wl-mix-bar" role="img" aria-label={shown.map((t) => `${TIER_LABELS[t]} ${counts[t]}`).join(", ")}>
        {shown.map((t) => (
          <span key={t} style={{ width: `${(counts[t] / total) * 100}%`, background: TIER_VAR[t] }} />
        ))}
      </div>
      <ul className="wl-mix-legend">
        {shown.map((t) => (
          <li key={t}>
            <span className="wl-swatch" style={{ background: TIER_VAR[t] }} aria-hidden />
            {TIER_LABELS[t]}
            <Bn as="span">({TIER_LABELS_BN[t]})</Bn>
            <b>{counts[t]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component — data comes from the parent (already fetched for the table)
// ---------------------------------------------------------------------------

interface Props {
  codes: string[];
  scores: ScoresResponse | null;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  /** Per-code "added on" meta — powers the "since you added" stat. */
  meta?: WatchlistMeta;
  /**
   * `snapshot` = the hero (mood word, one sentence, the four answers + quality mix)
   * meant to sit above the list. `details` = the "What stands out" folds
   * meant to sit below it. `all` = both (legacy).
   */
  mode?: "snapshot" | "details" | "all";
}

export default function WatchlistAnalysis({
  codes,
  scores,
  extremes,
  dividends,
  meta,
  mode = "all",
}: Props) {
  const codeSet = useMemo(() => new Set(codes.map((c) => c.toUpperCase())), [codes]);

  const rows = useMemo<ScoreItem[]>(() => {
    if (!scores) return [];
    return flattenTiers(scores)
      .filter((it) => codeSet.has(it.trading_code.toUpperCase()))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [scores, codeSet]);

  // Average move since each stock was followed (only codes with a recorded
  // price at add). One number for "is this list working out?".
  const sinceAdded = useMemo(() => {
    if (!meta) return null;
    const pcts: number[] = [];
    for (const r of rows) {
      const m = meta[r.trading_code.toUpperCase()];
      if (!m || m.price_at_add == null || m.price_at_add <= 0 || r.ltp == null) continue;
      pcts.push(((r.ltp - m.price_at_add) / m.price_at_add) * 100);
    }
    if (pcts.length === 0) return null;
    return { avg: pcts.reduce((a, b) => a + b, 0) / pcts.length, n: pcts.length };
  }, [meta, rows]);

  const story = useMemo(() => {
    if (!rows.length || !scores) return null;

    // Tier mix — classified client-side from the score (canonical getTier thresholds)
    const tierCounts: Record<TierKey, number> = { excellent: 0, good: 0, average: 0, weak: 0 };
    const tierCodes: Record<TierKey, string[]> = { excellent: [], good: [], average: [], weak: [] };
    for (const r of rows) {
      const t = getTier(r.score);
      tierCounts[t] += 1;
      tierCodes[t].push(r.trading_code);
    }
    const qualityCount = tierCounts.excellent + tierCounts.good;
    const qualityPct = (qualityCount / rows.length) * 100;

    // Avg score + today
    const scoreVals = rows.map((r) => r.score).filter((v): v is number => v != null);
    const avgScore = scoreVals.length ? scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length : null;
    const chgVals = rows.map((r) => r.change_pct).filter((v): v is number => v != null);
    const avgChg = chgVals.length ? chgVals.reduce((a, b) => a + b, 0) / chgVals.length : null;

    // Strongest / weakest by score (rows are already sorted desc by score)
    const scored = rows.filter((r) => r.score != null);
    const topScorer = scored[0] ?? null;
    const bottomScorer = scored.length > 1 ? scored[scored.length - 1] : null;

    // Breadth today
    const upToday = rows.filter((r) => (r.change_pct ?? 0) > 0);
    const downToday = rows.filter((r) => (r.change_pct ?? 0) < 0);
    const flatToday = rows.length - upToday.length - downToday.length;

    const topGainer = rows
      .filter((r) => r.change_pct != null && r.change_pct > 0)
      .sort((a, b) => b.change_pct! - a.change_pct!)[0] ?? null;
    const topLoser = rows
      .filter((r) => r.change_pct != null && r.change_pct < 0)
      .sort((a, b) => a.change_pct! - b.change_pct!)[0] ?? null;

    // Sectors
    const sectorCount = new Map<string, number>();
    for (const r of rows) {
      if (r.sector) sectorCount.set(r.sector, (sectorCount.get(r.sector) ?? 0) + 1);
    }
    const sectorsSorted = Array.from(sectorCount.entries()).sort((a, b) => b[1] - a[1]);
    const dominantSector = sectorsSorted[0] ?? null;
    const sectorConcentrationPct = dominantSector ? (dominantSector[1] / rows.length) * 100 : 0;

    // Income character
    const dividendPayers = rows.filter((r) => (r.div_yield_pct ?? 0) > 0);
    const dividendPct = (dividendPayers.length / rows.length) * 100;
    const highestYield = [...rows]
      .filter((r) => r.div_yield_pct != null && r.div_yield_pct > 0)
      .sort((a, b) => b.div_yield_pct! - a.div_yield_pct!)[0] ?? null;

    // Growth character
    const epsGrowers = rows.filter((r) => (r.eps_yoy_pct ?? 0) > 10);
    const epsShrinkers = rows.filter((r) => (r.eps_yoy_pct ?? 0) < -10);
    const bestGrower = [...rows]
      .filter((r) => r.eps_yoy_pct != null)
      .sort((a, b) => b.eps_yoy_pct! - a.eps_yoy_pct!)[0] ?? null;

    // Near extremes
    const nearHighSet = new Set((extremes?.near_high ?? []).map((x) => x.trading_code.toUpperCase()));
    const nearLowSet = new Set((extremes?.near_low ?? []).map((x) => x.trading_code.toUpperCase()));
    const nearHigh = rows.filter((r) => nearHighSet.has(r.trading_code.toUpperCase()));
    const nearLow = rows.filter((r) => nearLowSet.has(r.trading_code.toUpperCase()));

    // Hidden value: high score AND near 52w low → potential value play
    const valuePlays = nearLow
      .filter((r) => (r.score ?? 0) >= 60)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Quality on sale: Excellent / Good tier near low
    const qualityOnSale = nearLow.filter((r) => {
      const t = getTier(r.score);
      return t === "excellent" || t === "good";
    });

    // Upcoming dividends within 30d
    const horizon = Date.now() + 30 * 24 * 3600 * 1000;
    const dueDividends: { code: string; date: string }[] = [];
    if (dividends) {
      for (const item of dividends.upcoming_record_dates) {
        if (!codeSet.has(item.trading_code.toUpperCase())) continue;
        if (!item.record_date) continue;
        const t = Date.parse(item.record_date);
        if (t >= Date.now() && t <= horizon) {
          dueDividends.push({ code: item.trading_code, date: item.record_date });
        }
      }
    }

    // Red flags
    const avoidCodes = tierCodes.weak;
    const weakBalance = rows.filter((r) => (r.p2_health ?? 10) < 4);
    const overValued = rows.filter((r) => (r.p4_val ?? 10) < 4);

    // Concentration
    const isConcentrated = rows.length >= 5 && sectorConcentrationPct >= 50;

    // Headline narrative
    let leaning = "balanced";
    let leaningBn = "মোটামুটি ভারসাম্যে আছে";
    if (qualityPct >= 70) {
      leaning = "solid";
      leaningBn = "বেশ মজবুত দেখাচ্ছে";
    } else if (qualityPct <= 30) {
      leaning = "risky";
      leaningBn = "বেশ ঝুঁকিপূর্ণ দেখাচ্ছে";
    } else if (qualityPct >= 50) {
      leaning = "tilted toward quality";
      leaningBn = "ভালো মানের দিকে ঝুঁকে আছে";
    }

    const moodWord =
      avgChg == null
        ? "quiet"
        : avgChg > 0.5
          ? "rallying"
          : avgChg < -0.5
            ? "under pressure"
            : "flat";

    const headline =
      `Your ${rows.length}-stock list looks ${leaning}` +
      `, and is ${moodWord} today` +
      `${avgChg != null ? ` at ${avgChg > 0 ? "+" : ""}${avgChg.toFixed(2)}%` : ""}.`;

    const bnMood =
      avgChg == null
        ? "আজ তেমন নড়াচড়া নেই"
        : avgChg > 0.5
          ? `আজ দিনটা ভালো যাচ্ছে — গড়ে ${avgChg.toFixed(2)}% বেড়েছে`
          : avgChg < -0.5
            ? `আজ একটু চাপে আছে — গড়ে ${Math.abs(avgChg).toFixed(2)}% কমেছে`
            : "আজ মোটামুটি শান্ত";
    const headlineBn = `আপনার ${rows.length}টি স্টকের তালিকা ${leaningBn}। ${bnMood}।`;

    const todayBn = [
      `আজ ${upToday.length}টি বেড়েছে, ${downToday.length}টি কমেছে` +
        (flatToday > 0 ? `, ${flatToday}টি আগের জায়গায়` : "") +
        "।",
      topGainer
        ? `সবচেয়ে বেশি বেড়েছে ${topGainer.trading_code} (+${topGainer.change_pct!.toFixed(1)}%)।`
        : "",
      topLoser
        ? `সবচেয়ে কমেছে ${topLoser.trading_code} (${topLoser.change_pct!.toFixed(1)}%)।`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      headline,
      leaning,
      headlineBn,
      todayBn,
      avgScore,
      avgChg,
      tierCounts,
      tierCodes,
      qualityPct,
      qualityCount,
      topScorer,
      bottomScorer,
      upToday,
      downToday,
      flatToday,
      topGainer,
      topLoser,
      sectorsSorted,
      dominantSector,
      sectorConcentrationPct,
      isConcentrated,
      dividendPayers,
      dividendPct,
      highestYield,
      epsGrowers,
      epsShrinkers,
      bestGrower,
      nearHigh,
      nearLow,
      valuePlays,
      qualityOnSale,
      dueDividends,
      avoidCodes,
      weakBalance,
      overValued,
    };
  }, [rows, scores, extremes, dividends, codeSet]);

  if (codes.length === 0) return null;

  const showSnapshot = mode === "snapshot" || mode === "all";
  const showDetails = mode === "details" || mode === "all";

  if (!rows.length || !story) {
    if (!showSnapshot) return null;
    return (
      <Card padding="md">
        <p className="text-sm text-text-main">No scored stocks in your watchlist yet.</p>
        <Bn className="mt-1 text-sm text-text-muted">
          আপনার তালিকার শেয়ারগুলোর স্কোর এখনো তৈরি হয়নি।
        </Bn>
      </Card>
    );
  }

  // ---- Hero: mood word, one sentence, then the four answers in one card ----
  const moodCls =
    story.avgChg == null || Math.abs(story.avgChg) <= 0.5
      ? "wl-mood--flat"
      : story.avgChg > 0
        ? "wl-mood--up"
        : "wl-mood--down";
  const moodLabel =
    story.avgChg == null
      ? "Quiet today"
      : story.avgChg > 0.5
        ? "Rising today"
        : story.avgChg < -0.5
          ? "Falling today"
          : "Flat today";
  const avgTier = story.avgScore != null ? getTier(story.avgScore) : null;

  const snapshot = (
    <section aria-labelledby="wl-hero-title">
      <span className={`wl-mood ${moodCls}`}>
        <span className="wl-mood-dot" aria-hidden />
        {moodLabel}
      </span>
      <h2 id="wl-hero-title" className="wl-headline">
        Your {rows.length} {rows.length === 1 ? "stock looks" : "stocks look"} {story.leaning}.
      </h2>
      <Bn className="wl-lead-bn">{story.headlineBn}</Bn>

      <Card padding="none" className="wl-answers">
        <div className="wl-answer-grid">
          {sinceAdded ? (
            <Answer
              q="Since you followed"
              qBn="যোগ করার পর"
              x={`Average of ${sinceAdded.n} ${sinceAdded.n === 1 ? "stock" : "stocks"}`}
            >
              <span className={changeTone(sinceAdded.avg)}>{changePct(sinceAdded.avg, 1)}</span>
            </Answer>
          ) : (
            <Answer q="Stocks followed" qBn="মোট শেয়ার">
              {rows.length}
            </Answer>
          )}
          <Answer q="Today" qBn="আজ" x="Average move">
            <span className={changeTone(story.avgChg)}>
              {story.avgChg != null ? changePct(story.avgChg) : "—"}
            </span>
          </Answer>
          <Answer
            q="Up · down"
            qBn="বেড়েছে · কমেছে"
            x={story.flatToday > 0 ? `${story.flatToday} unchanged` : "Every stock moved"}
          >
            <span className="text-positive">{story.upToday.length}</span>
            <span className="px-1.5 font-normal text-text-muted">·</span>
            <span className="text-negative">{story.downToday.length}</span>
          </Answer>
          <Answer
            q="Average score"
            qBn="গড় স্কোর"
            x={avgTier ? TIER_LABELS[avgTier] : undefined}
          >
            <span style={avgTier ? { color: TIER_VAR[avgTier] } : undefined}>
              {story.avgScore != null ? Math.round(story.avgScore) : "—"}
            </span>
          </Answer>
        </div>
        <TierMix counts={story.tierCounts} total={rows.length} />
      </Card>
    </section>
  );

  if (!showDetails) return snapshot;


  // ---- Detail sections (each built as an item list so the header can show
  //      a count while collapsed) -------------------------------------------
  const basketItems: React.ReactNode[] = [
    <StoryItem
      key="quality"
      tone={story.qualityPct >= 50 ? "good" : "warn"}
      label={`${Math.round(story.qualityPct)}% quality`}
      bn={`${rows.length}টির মধ্যে ${story.qualityCount}টি স্টক ভালো মানের (Excellent বা Good)।`}
    >
      {story.qualityCount} of {rows.length} stocks rate Excellent or Good
      {story.tierCodes.excellent.length > 0 && (
        <>. Best of the lot: {inlineList(story.tierCodes.excellent.slice(0, 3))}</>
      )}
      .
    </StoryItem>,
  ];
  if (story.topScorer) {
    basketItems.push(
      <StoryItem
        key="strongest"
        tone="primary"
        label="Strongest vs weakest"
        bn={`সবচেয়ে শক্ত ${story.topScorer.trading_code}${story.bottomScorer ? `, সবচেয়ে দুর্বল ${story.bottomScorer.trading_code}` : ""}।`}
      >
        <CodeChip code={story.topScorer.trading_code} /> leads with score{" "}
        <span className="font-bold nums">{Math.round(story.topScorer.score!)}</span>
        {story.bottomScorer && (
          <>
            , while <CodeChip code={story.bottomScorer.trading_code} /> sits at the bottom with{" "}
            <span className="font-bold nums">{Math.round(story.bottomScorer.score!)}</span>
          </>
        )}
        .
      </StoryItem>,
    );
  }
  if (story.dominantSector) {
    basketItems.push(
      <StoryItem
        key="sector"
        tone={story.isConcentrated ? "warn" : "primary"}
        label="Sector tilt"
        bn={
          story.isConcentrated
            ? `তালিকার ${Math.round(story.sectorConcentrationPct)}% স্টকই ${story.dominantSector[0]} খাতে — একটু ছড়িয়ে দিলে ঝুঁকি কমে।`
            : `স্টকগুলো ${story.sectorsSorted.length}টি খাতে ছড়ানো, সবচেয়ে বেশি ${story.dominantSector[0]} খাতে।`
        }
      >
        {story.isConcentrated ? (
          <>
            Heavy on <span className="font-bold">{story.dominantSector[0]}</span> —{" "}
            {Math.round(story.sectorConcentrationPct)}% of your list. Consider diversifying.
          </>
        ) : (
          <>
            Spread across {story.sectorsSorted.length} sector
            {story.sectorsSorted.length > 1 ? "s" : ""}, led by{" "}
            <span className="font-bold">{story.dominantSector[0]}</span> (
            {story.dominantSector[1]} stock{story.dominantSector[1] > 1 ? "s" : ""}).
          </>
        )}
      </StoryItem>,
    );
  }
  basketItems.push(
    <StoryItem
      key="personality"
      tone="primary"
      label="Personality"
      bn={
        story.dividendPct >= 60
          ? `আপনার তালিকা ডিভিডেন্ড-বান্ধব — ${story.dividendPayers.length}টি কোম্পানি শেয়ারহোল্ডারদের টাকা দেয়।`
          : story.epsGrowers.length > story.dividendPayers.length
            ? `আপনার তালিকা গ্রোথ-মুখী — ${story.epsGrowers.length}টি কোম্পানির আয় দ্রুত বাড়ছে।`
            : `ডিভিডেন্ড আর গ্রোথ — দুটোরই মিশ্রণ আছে আপনার তালিকায়।`
      }
    >
      {story.dividendPct >= 60 ? (
        <>
          Income-leaning — {story.dividendPayers.length} stocks pay dividends
          {story.highestYield?.div_yield_pct != null && (
            <>
              , best yield from <CodeChip code={story.highestYield.trading_code} /> at{" "}
              {story.highestYield.div_yield_pct.toFixed(1)}%
            </>
          )}
          .
        </>
      ) : story.epsGrowers.length > story.dividendPayers.length ? (
        <>
          Growth-leaning — {story.epsGrowers.length} stocks grew EPS &gt; 10% YoY
          {story.bestGrower?.eps_yoy_pct != null && (
            <>
              , fastest is <CodeChip code={story.bestGrower.trading_code} /> at +
              {story.bestGrower.eps_yoy_pct.toFixed(0)}%
            </>
          )}
          .
        </>
      ) : (
        <>
          Mixed — {story.dividendPayers.length} dividend payer
          {story.dividendPayers.length === 1 ? "" : "s"}, {story.epsGrowers.length} fast grower
          {story.epsGrowers.length === 1 ? "" : "s"}.
        </>
      )}
    </StoryItem>,
  );
  if (story.nearHigh.length > 0 || story.nearLow.length > 0) {
    basketItems.push(
      <StoryItem
        key="position"
        tone="primary"
        label="Price position"
        bn={`${story.nearHigh.length > 0 ? `${story.nearHigh.length}টি স্টক বছরের সর্বোচ্চ দামের কাছে` : ""}${story.nearHigh.length > 0 && story.nearLow.length > 0 ? ", " : ""}${story.nearLow.length > 0 ? `${story.nearLow.length}টি সর্বনিম্নের কাছে` : ""}।`}
      >
        {story.nearHigh.length > 0 && (
          <>
            {story.nearHigh.length} near the 52-week high (
            {inlineList(story.nearHigh.map((r) => r.trading_code), 3)})
          </>
        )}
        {story.nearHigh.length > 0 && story.nearLow.length > 0 && <>, </>}
        {story.nearLow.length > 0 && (
          <>
            {story.nearLow.length} near the 52-week low (
            {inlineList(story.nearLow.map((r) => r.trading_code), 3)})
          </>
        )}
        .
      </StoryItem>,
    );
  }

  const todayItems: React.ReactNode[] = [];
  if (story.topGainer) {
    todayItems.push(
      <StoryItem key="best" tone="good" label="Best">
        <CodeChip code={story.topGainer.trading_code} /> led the gainers, up{" "}
        <span className="font-bold text-positive nums">
          +{story.topGainer.change_pct!.toFixed(2)}%
        </span>
        .
      </StoryItem>,
    );
  }
  if (story.topLoser) {
    todayItems.push(
      <StoryItem key="worst" tone="bad" label="Worst">
        <CodeChip code={story.topLoser.trading_code} /> dragged, off{" "}
        <span className="font-bold text-negative nums">
          {story.topLoser.change_pct!.toFixed(2)}%
        </span>
        .
      </StoryItem>,
    );
  }
  if (story.upToday.length > story.downToday.length * 2 && story.upToday.length >= 3) {
    todayItems.push(
      <StoryItem key="breadth-up" tone="good" label="Breadth">
        Broad-based strength — most of your list closed green.
      </StoryItem>,
    );
  }
  if (story.downToday.length > story.upToday.length * 2 && story.downToday.length >= 3) {
    todayItems.push(
      <StoryItem key="breadth-dn" tone="bad" label="Breadth">
        Broad-based weakness — selling pressure across most of your list.
      </StoryItem>,
    );
  }
  const quietToday = story.upToday.length === 0 && story.downToday.length === 0;

  const lookItems: React.ReactNode[] = [];
  if (story.qualityOnSale.length > 0) {
    lookItems.push(
      <StoryItem
        key="sale"
        tone="good"
        label="Quality on sale"
        bn="ভালো স্কোরের স্টক এখন বছরের সর্বনিম্ন দামের কাছে — সস্তায় কেনার সুযোগ হতে পারে, তবে আগে যাচাই করুন।"
      >
        {inlineList(story.qualityOnSale.map((r) => r.trading_code))} rate Excellent or Good AND
        trade within 5% of the 52-week low — a possible bargain if the business still looks
        healthy.
      </StoryItem>,
    );
  } else if (story.valuePlays.length > 0) {
    lookItems.push(
      <StoryItem
        key="value"
        tone="good"
        label="High score, low price"
        bn="স্কোর 60-এর বেশি, কিন্তু দাম বছরের সর্বনিম্নের কাছে।"
      >
        {inlineList(story.valuePlays.map((r) => r.trading_code))} score 60+ and sit near 52-week
        lows.
      </StoryItem>,
    );
  }
  if (story.dueDividends.length > 0) {
    lookItems.push(
      <StoryItem
        key="div"
        tone="primary"
        label="Dividend dates ahead"
        bn="আগামী 30 দিনের মধ্যে রেকর্ড ডেট — ডিভিডেন্ড পেতে হলে ওই দিনের আগে শেয়ার ধরে রাখতে হবে।"
      >
        {inlineList(story.dueDividends.map((d) => d.code))} have record dates in the next 30 days
        — hold before the record date to get the dividend.
      </StoryItem>,
    );
  }
  if (story.nearHigh.length > 0) {
    lookItems.push(
      <StoryItem
        key="highs"
        tone="warn"
        label="Pushing highs"
        bn="বছরের সর্বোচ্চ দামের কাছাকাছি — গতি ভালো, তবে এখান থেকে দাম আটকে যেতেও পারে।"
      >
        {inlineList(story.nearHigh.map((r) => r.trading_code))} trade within 5% of the 52-week
        high — momentum is strong, but the price may pause here.
      </StoryItem>,
    );
  }

  const riskItems: React.ReactNode[] = [];
  if (story.avoidCodes.length > 0) {
    riskItems.push(
      <StoryItem
        key="weak"
        tone="bad"
        label="Weak tier"
        bn="এই স্টকগুলোর স্কোর 45-এর নিচে — কেন রেখেছেন, আরেকবার ভেবে দেখুন।"
      >
        {inlineList(story.avoidCodes)} score below 45 — review why you hold them, or consider
        trimming.
      </StoryItem>,
    );
  }
  if (story.weakBalance.length > 0) {
    riskItems.push(
      <StoryItem
        key="balance"
        tone="warn"
        label="Weak balance sheet"
        bn="এই কোম্পানিগুলোর ধারদেনা বা নগদ টাকার অবস্থা দুর্বল।"
      >
        {inlineList(story.weakBalance.map((r) => r.trading_code))} score low on financial health
        — debt or cash position is a worry.
      </StoryItem>,
    );
  }
  if (story.overValued.length > 0) {
    riskItems.push(
      <StoryItem
        key="expensive"
        tone="warn"
        label="Looks expensive"
        bn="নিজেদের ইতিহাসের তুলনায় এই স্টকগুলোর দাম বেশি মনে হচ্ছে।"
      >
        {inlineList(story.overValued.map((r) => r.trading_code))} score low on valuation — the
        price looks stretched vs their own history.
      </StoryItem>,
    );
  }
  if (story.epsShrinkers.length > 0) {
    riskItems.push(
      <StoryItem
        key="shrink"
        tone="warn"
        label="Earnings shrinking"
        bn="এই কোম্পানিগুলোর আয় আগের বছরের চেয়ে কমেছে।"
      >
        {inlineList(story.epsShrinkers.map((r) => r.trading_code))} posted EPS drops &gt; 10%
        year-on-year.
      </StoryItem>,
    );
  }
  if (story.isConcentrated) {
    riskItems.push(
      <StoryItem
        key="concentration"
        tone="warn"
        label="Concentration risk"
        bn="একটাই খাতে অনেক বেশি স্টক — খাতটা খারাপ করলে পুরো তালিকা একসাথে ভুগবে।"
      >
        {Math.round(story.sectorConcentrationPct)}% of your list sits in{" "}
        <span className="font-bold">{story.dominantSector?.[0]}</span>. One sector shock would
        hurt the whole list.
      </StoryItem>,
    );
  }

  const details = (
    <section className="wl-section" aria-labelledby="wl-standout">
      <SectionHeader
        id="wl-standout"
        title="What stands out"
        bn="আপনার তালিকায় যা চোখে পড়ার মতো — সহজ ভাষায়"
        lead="Written from today's scores and prices. Tap a line to open it."
      />
      <Card padding="none" className="wl-folds">
        <Fold title="What's in your list" titleBn="আপনার তালিকায় কী আছে" count={basketItems.length}>
          <ul className="wl-story">{basketItems}</ul>
        </Fold>

        <Fold
          title="What moved today"
          titleBn="আজ কী নড়ল"
          count={quietToday ? undefined : todayItems.length}
        >
          {quietToday ? (
            <>
              <p className="text-sm text-text-main">No price moves recorded today.</p>
              <Bn className="mt-1 text-sm text-text-muted">আজ কোনো দামের নড়াচড়া রেকর্ড হয়নি।</Bn>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold nums">
                <span className="text-positive">▲ {story.upToday.length} up</span>
                <span className="px-2 text-text-muted">·</span>
                <span className="text-text-muted">{story.flatToday} unchanged</span>
                <span className="px-2 text-text-muted">·</span>
                <span className="text-negative">▼ {story.downToday.length} down</span>
              </p>
              <ul className="wl-story">{todayItems}</ul>
              <Bn className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-text-muted">
                {story.todayBn}
              </Bn>
            </>
          )}
        </Fold>

        {lookItems.length > 0 && (
          <Fold
            title="Worth a second look"
            titleBn="নজরে রাখার মতো"
            count={lookItems.length}
            countTone="good"
          >
            <ul className="wl-story">{lookItems}</ul>
          </Fold>
        )}

        {riskItems.length > 0 && (
          <Fold title="Heads up" titleBn="একটু সাবধান" count={riskItems.length} countTone="bad">
            <ul className="wl-story">{riskItems}</ul>
          </Fold>
        )}
      </Card>
    </section>
  );

  if (!showSnapshot) return details;
  return (
    <>
      {snapshot}
      {details}
    </>
  );
}
