"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import {
  flattenTiers,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremesData,
  type DividendsUpcoming,
  type WatchlistMeta,
} from "@/lib/api";
import { changePct, changeTone } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

// One language at a time: static words are `<T>` pairs; sentences that carry
// stock codes are built per language from `lang` (this card renders on the
// client after the watchlist loads). Numbers in Bengali stay Western — 9, 6.1%.

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

function inlineList(codes: string[], cap = 3): ReactNode {
  const shown = codes.slice(0, cap);
  const more = codes.length - cap;
  return (
    <>
      {shown.map((c, i) => (
        <span key={c}>
          <CodeChip code={c} />
          {i < shown.length - 1 ? ", " : ""}
        </span>
      ))}
      {more > 0 && (
        <span className="text-text-muted">
          <T en={` and ${more} more`} bn={` ও আরও ${more}টি`} />
        </span>
      )}
    </>
  );
}

/** One fold inside the "What stands out" card: title + count is the
 *  <summary>; the body opens on tap. Hairlines, no tinted header. */
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
  children: ReactNode;
}) {
  return (
    <details className="wl-fold">
      <summary>
        <div className="min-w-0 flex-1">
          <h3 className="wl-fold-title">
            <T en={title} bn={titleBn} />
          </h3>
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

/** One story point: tone dot, a short label and one sentence in the reader's language. */
function StoryItem({
  tone,
  label,
  children,
}: {
  tone: Tone;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="wl-story-dot" style={{ background: TONE_COLOR[tone] }} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-text-main">
          <span className="font-semibold">{label}:</span> {children}
        </p>
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
  children: ReactNode;
  x?: ReactNode;
}) {
  return (
    <div className="wl-answer">
      <p className="wl-answer-q">
        <T en={q} bn={qBn} />
      </p>
      <p className="wl-answer-a">{children}</p>
      {x && <p className="wl-answer-x">{x}</p>}
    </div>
  );
}

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

function TierMix({ counts, total }: { counts: Record<TierKey, number>; total: number }) {
  const { lang } = useLang();
  if (total === 0) return null;
  const shown = TIER_ORDER.filter((t) => counts[t] > 0);
  const words = lang === "bn" ? TIER_LABELS_BN : TIER_LABELS;
  return (
    <div className="wl-mix">
      <div className="wl-mix-head">
        <p className="wl-mix-title">
          <T en="Quality mix" bn="কোন মানের শেয়ার কয়টি" />
        </p>
      </div>
      <div className="wl-mix-bar" role="img" aria-label={shown.map((t) => `${words[t]} ${counts[t]}`).join(", ")}>
        {shown.map((t) => (
          <span key={t} style={{ width: `${(counts[t] / total) * 100}%`, background: TIER_VAR[t] }} />
        ))}
      </div>
      <ul className="wl-mix-legend">
        {shown.map((t) => (
          <li key={t}>
            <span className="wl-swatch" style={{ background: TIER_VAR[t] }} aria-hidden />
            <T en={TIER_LABELS[t]} bn={TIER_LABELS_BN[t]} />
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

type Leaning = "solid" | "risky" | "quality" | "balanced";

export default function WatchlistAnalysis({
  codes,
  scores,
  extremes,
  dividends,
  meta,
  mode = "all",
}: Props) {
  const { lang } = useLang();
  const bn = lang === "bn";
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

    // Headline: how the list leans on quality
    const leaning: Leaning =
      qualityPct >= 70 ? "solid" : qualityPct <= 30 ? "risky" : qualityPct >= 50 ? "quality" : "balanced";

    return {
      leaning,
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
        <p className="text-sm text-text-main">
          <T
            en="None of the shares in your watchlist has a score yet."
            bn="আপনার ওয়াচলিস্টের কোনো শেয়ারের স্কোর এখনো তৈরি হয়নি।"
          />
        </p>
      </Card>
    );
  }

  // ---- Hero: mood word, one sentence, then the four answers in one card ----
  const n = rows.length;
  const moodCls =
    story.avgChg == null || Math.abs(story.avgChg) <= 0.5
      ? "wl-mood--flat"
      : story.avgChg > 0
        ? "wl-mood--up"
        : "wl-mood--down";
  const moodLabel =
    story.avgChg == null ? (
      <T en="Quiet today" bn="আজ কোনো নড়াচড়া নেই" />
    ) : story.avgChg > 0.5 ? (
      <T en="Rising today" bn="আজ দাম বাড়ছে" />
    ) : story.avgChg < -0.5 ? (
      <T en="Falling today" bn="আজ দাম কমছে" />
    ) : (
      <T en="Flat today" bn="আজ প্রায় অপরিবর্তিত" />
    );
  const headline: Record<Leaning, { en: string; bn: string }> = {
    solid: {
      en: n === 1 ? "Your one share looks solid." : `Your ${n} shares look solid.`,
      bn: n === 1 ? "আপনার শেয়ারটি বেশ মজবুত।" : `আপনার ${n}টি শেয়ার বেশ মজবুত।`,
    },
    quality: {
      en: `Your ${n} shares lean toward good companies.`,
      bn: `আপনার ${n}টি শেয়ার ভালো মানের দিকে ঝুঁকে আছে।`,
    },
    balanced: {
      en: `Your ${n} shares are a mixed list.`,
      bn: `আপনার ${n}টি শেয়ার মোটামুটি মিশ্র।`,
    },
    risky: {
      en:
        n === 1
          ? "Your one share is not a strong company, so it carries more risk."
          : `Few of your ${n} shares are strong companies, so the list carries more risk.`,
      bn:
        n === 1
          ? "আপনার শেয়ারটি শক্তিশালী কোম্পানির নয়, তাই ঝুঁকি বেশি।"
          : `আপনার ${n}টি শেয়ারের মধ্যে শক্তিশালী কোম্পানি কম, তাই ঝুঁকি বেশি।`,
    },
  };
  const avgTier = story.avgScore != null ? getTier(story.avgScore) : null;

  const snapshot = (
    <section aria-labelledby="wl-hero-title">
      <span className={`wl-mood ${moodCls}`}>
        <span className="wl-mood-dot" aria-hidden />
        {moodLabel}
      </span>
      <h2 id="wl-hero-title" className="wl-headline">
        <T en={headline[story.leaning].en} bn={headline[story.leaning].bn} />
      </h2>

      <Card padding="none" className="wl-answers">
        <div className="wl-answer-grid">
          {sinceAdded ? (
            <Answer
              q="Since you followed"
              qBn="যোগ করার পর"
              x={
                <T
                  en={`Average of ${sinceAdded.n} ${sinceAdded.n === 1 ? "share" : "shares"}`}
                  bn={`${sinceAdded.n}টি শেয়ারের গড়`}
                />
              }
            >
              <span className={changeTone(sinceAdded.avg)}>{changePct(sinceAdded.avg, 1)}</span>
            </Answer>
          ) : (
            <Answer q="Shares followed" qBn="মোট শেয়ার">
              {n}
            </Answer>
          )}
          <Answer q="Today" qBn="আজ" x={<T en="Average move" bn="গড় ওঠানামা" />}>
            <span className={changeTone(story.avgChg)}>
              {story.avgChg != null ? changePct(story.avgChg) : "—"}
            </span>
          </Answer>
          <Answer
            q="Up · down"
            qBn="বেড়েছে · কমেছে"
            x={
              story.flatToday > 0 ? (
                <T en={`${story.flatToday} unchanged`} bn={`${story.flatToday}টি অপরিবর্তিত`} />
              ) : (
                <T en="Every share moved" bn="সবগুলোর দাম বদলেছে" />
              )
            }
          >
            <span className="text-positive">{story.upToday.length}</span>
            <span className="px-1.5 font-normal text-text-muted">·</span>
            <span className="text-negative">{story.downToday.length}</span>
          </Answer>
          <Answer
            q="Average score"
            qBn="গড় স্কোর"
            x={avgTier ? <T en={TIER_LABELS[avgTier]} bn={TIER_LABELS_BN[avgTier]} /> : undefined}
          >
            <span style={avgTier ? { color: TIER_VAR[avgTier] } : undefined}>
              {story.avgScore != null ? Math.round(story.avgScore) : "—"}
            </span>
          </Answer>
        </div>
        <TierMix counts={story.tierCounts} total={n} />
      </Card>
    </section>
  );

  if (!showDetails) return snapshot;

  // ---- Detail sections (each built as an item list so the header can show
  //      a count while collapsed). Sentences are written per language. -------
  const sector = story.dominantSector?.[0] ?? "";
  const sectorName = bn ? sectorBn(sector) : sector;
  const concPct = Math.round(story.sectorConcentrationPct);

  const basketItems: ReactNode[] = [
    <StoryItem key="quality" tone={story.qualityPct >= 50 ? "good" : "warn"} label={<T en="Quality" bn="মান" />}>
      {bn ? (
        <>
          {n}টির মধ্যে {story.qualityCount}টি শেয়ার চমৎকার বা ভালো মানের।
          {story.tierCodes.excellent.length > 0 && (
            <> সবচেয়ে শক্তিশালী {inlineList(story.tierCodes.excellent.slice(0, 3))}।</>
          )}
        </>
      ) : (
        <>
          {story.qualityCount} of {n} shares are rated Excellent or Good.
          {story.tierCodes.excellent.length > 0 && (
            <> The strongest are {inlineList(story.tierCodes.excellent.slice(0, 3))}.</>
          )}
        </>
      )}
    </StoryItem>,
  ];
  if (story.topScorer) {
    const top = story.topScorer;
    const bottom = story.bottomScorer;
    basketItems.push(
      <StoryItem
        key="strongest"
        tone="primary"
        label={<T en="Strongest and weakest" bn="সবচেয়ে শক্তিশালী ও দুর্বল" />}
      >
        {bn ? (
          <>
            সবচেয়ে বেশি স্কোর <CodeChip code={top.trading_code} />-এর,{" "}
            <span className="font-bold nums">{Math.round(top.score!)}</span>।
            {bottom && (
              <>
                {" "}সবচেয়ে কম <CodeChip code={bottom.trading_code} />-এর,{" "}
                <span className="font-bold nums">{Math.round(bottom.score!)}</span>।
              </>
            )}
          </>
        ) : (
          <>
            <CodeChip code={top.trading_code} /> leads with a score of{" "}
            <span className="font-bold nums">{Math.round(top.score!)}</span>
            {bottom && (
              <>
                , and <CodeChip code={bottom.trading_code} /> is lowest at{" "}
                <span className="font-bold nums">{Math.round(bottom.score!)}</span>
              </>
            )}
            .
          </>
        )}
      </StoryItem>,
    );
  }
  if (story.dominantSector) {
    const k = story.sectorsSorted.length;
    const c = story.dominantSector[1];
    basketItems.push(
      <StoryItem
        key="sector"
        tone={story.isConcentrated ? "warn" : "primary"}
        label={<T en="Sectors" bn="সেক্টর" />}
      >
        {story.isConcentrated ? (
          bn ? (
            <>
              আপনার তালিকার {concPct}% শেয়ার <span className="font-bold">{sectorName}</span> সেক্টরে। আরও
              কয়েকটি সেক্টরে ছড়ালে ঝুঁকি কমে।
            </>
          ) : (
            <>
              {concPct}% of your list is in <span className="font-bold">{sectorName}</span>. Spreading across
              more sectors would lower the risk.
            </>
          )
        ) : bn ? (
          <>
            শেয়ারগুলো {k}টি সেক্টরে ছড়ানো, সবচেয়ে বেশি <span className="font-bold">{sectorName}</span>{" "}
            সেক্টরে ({c}টি)।
          </>
        ) : (
          <>
            Spread across {k} sector{k > 1 ? "s" : ""}, led by <span className="font-bold">{sectorName}</span>{" "}
            with {c} share{c > 1 ? "s" : ""}.
          </>
        )}
      </StoryItem>,
    );
  }
  {
    const d = story.dividendPayers.length;
    const g = story.epsGrowers.length;
    const hy = story.highestYield;
    const bg = story.bestGrower;
    basketItems.push(
      <StoryItem key="personality" tone="primary" label={<T en="Kind of list" bn="তালিকার ধরন" />}>
        {story.dividendPct >= 60 ? (
          bn ? (
            <>
              তালিকাটি ডিভিডেন্ডের দিকে: {d}টি কোম্পানি ডিভিডেন্ড দেয়
              {hy?.div_yield_pct != null && (
                <>
                  , সবচেয়ে বেশি ইল্ড <CodeChip code={hy.trading_code} />-এর, {hy.div_yield_pct.toFixed(1)}%
                </>
              )}
              ।
            </>
          ) : (
            <>
              It leans toward income: {d} shares pay a dividend
              {hy?.div_yield_pct != null && (
                <>
                  , and the highest yield is <CodeChip code={hy.trading_code} /> at {hy.div_yield_pct.toFixed(1)}%
                </>
              )}
              .
            </>
          )
        ) : g > d ? (
          bn ? (
            <>
              তালিকাটি বৃদ্ধির দিকে: {g}টি কোম্পানির ইপিএস এক বছরে 10%-এর বেশি বেড়েছে
              {bg?.eps_yoy_pct != null && (
                <>
                  , সবচেয়ে বেশি <CodeChip code={bg.trading_code} />-এর, +{bg.eps_yoy_pct.toFixed(0)}%
                </>
              )}
              ।
            </>
          ) : (
            <>
              It leans toward growth: {g} companies grew their profit per share by more than 10% in a year
              {bg?.eps_yoy_pct != null && (
                <>
                  , and the fastest is <CodeChip code={bg.trading_code} /> at +{bg.eps_yoy_pct.toFixed(0)}%
                </>
              )}
              .
            </>
          )
        ) : bn ? (
          <>
            দুটোরই মিশ্রণ: {d}টি ডিভিডেন্ড দেয়, আর {g}টির মুনাফা দ্রুত বাড়ছে।
          </>
        ) : (
          <>
            A mix of both: {d} {d === 1 ? "pays" : "pay"} a dividend and {g} {g === 1 ? "is" : "are"} growing
            fast.
          </>
        )}
      </StoryItem>,
    );
  }
  if (story.nearHigh.length > 0 || story.nearLow.length > 0) {
    const hi = story.nearHigh;
    const lo = story.nearLow;
    basketItems.push(
      <StoryItem key="position" tone="primary" label={<T en="Price this year" bn="এ বছরের দাম" />}>
        {bn ? (
          <>
            {hi.length > 0 && (
              <>
                {hi.length}টি গত এক বছরের সর্বোচ্চ দামের কাছে ({inlineList(hi.map((r) => r.trading_code), 3)})
              </>
            )}
            {hi.length > 0 && lo.length > 0 && <>, </>}
            {lo.length > 0 && (
              <>
                {lo.length}টি সর্বনিম্নের কাছে ({inlineList(lo.map((r) => r.trading_code), 3)})
              </>
            )}
            ।
          </>
        ) : (
          <>
            {hi.length > 0 && (
              <>
                {hi.length} near the highest price of the past year (
                {inlineList(hi.map((r) => r.trading_code), 3)})
              </>
            )}
            {hi.length > 0 && lo.length > 0 && <>, </>}
            {lo.length > 0 && (
              <>
                {lo.length} near the lowest ({inlineList(lo.map((r) => r.trading_code), 3)})
              </>
            )}
            .
          </>
        )}
      </StoryItem>,
    );
  }

  const todayItems: ReactNode[] = [];
  if (story.topGainer) {
    const g = story.topGainer;
    const v = (
      <span className="font-bold text-positive nums">+{g.change_pct!.toFixed(2)}%</span>
    );
    todayItems.push(
      <StoryItem key="best" tone="good" label={<T en="Best" bn="সবচেয়ে ভালো" />}>
        {bn ? (
          <>
            সবচেয়ে বেশি বেড়েছে <CodeChip code={g.trading_code} />, {v}।
          </>
        ) : (
          <>
            <CodeChip code={g.trading_code} /> rose the most, up {v}.
          </>
        )}
      </StoryItem>,
    );
  }
  if (story.topLoser) {
    const l = story.topLoser;
    const v = <span className="font-bold text-negative nums">{l.change_pct!.toFixed(2)}%</span>;
    todayItems.push(
      <StoryItem key="worst" tone="bad" label={<T en="Weakest" bn="সবচেয়ে দুর্বল" />}>
        {bn ? (
          <>
            সবচেয়ে বেশি কমেছে <CodeChip code={l.trading_code} />, {v}।
          </>
        ) : (
          <>
            <CodeChip code={l.trading_code} /> fell the most, down {v}.
          </>
        )}
      </StoryItem>,
    );
  }
  if (story.upToday.length > story.downToday.length * 2 && story.upToday.length >= 3) {
    todayItems.push(
      <StoryItem key="breadth-up" tone="good" label={<T en="Overall" bn="সার্বিক" />}>
        <T
          en="Most of your list closed higher today."
          bn="আজ আপনার তালিকার বেশির ভাগ শেয়ারের দাম বেড়েছে।"
        />
      </StoryItem>,
    );
  }
  if (story.downToday.length > story.upToday.length * 2 && story.downToday.length >= 3) {
    todayItems.push(
      <StoryItem key="breadth-dn" tone="bad" label={<T en="Overall" bn="সার্বিক" />}>
        <T
          en="Most of your list closed lower today."
          bn="আজ আপনার তালিকার বেশির ভাগ শেয়ারের দাম কমেছে।"
        />
      </StoryItem>,
    );
  }
  const quietToday = story.upToday.length === 0 && story.downToday.length === 0;

  const lookItems: ReactNode[] = [];
  if (story.qualityOnSale.length > 0) {
    const list = inlineList(story.qualityOnSale.map((r) => r.trading_code));
    lookItems.push(
      <StoryItem key="sale" tone="good" label={<T en="Good companies at a low price" bn="কম দামে ভালো কোম্পানি" />}>
        {bn ? (
          <>
            {list} চমৎকার বা ভালো মানের, আর দাম গত এক বছরের সর্বনিম্নের 5%-এর মধ্যে। ব্যবসা ভালো থাকলে এটি
            কেনার সুযোগ হতে পারে, তবে আগে যাচাই করে নিন।
          </>
        ) : (
          <>
            {list} are rated Excellent or Good and trade within 5% of their lowest price of the past year.
            That may be a chance to buy, if the business still looks healthy.
          </>
        )}
      </StoryItem>,
    );
  } else if (story.valuePlays.length > 0) {
    const list = inlineList(story.valuePlays.map((r) => r.trading_code));
    lookItems.push(
      <StoryItem key="value" tone="good" label={<T en="High score, low price" bn="স্কোর বেশি, দাম কম" />}>
        {bn ? (
          <>{list}-এর স্কোর 60 বা তার বেশি, আর দাম গত এক বছরের সর্বনিম্নের কাছে।</>
        ) : (
          <>{list} score 60 or more and trade near their lowest price of the past year.</>
        )}
      </StoryItem>,
    );
  }
  if (story.dueDividends.length > 0) {
    const list = inlineList(story.dueDividends.map((d) => d.code));
    lookItems.push(
      <StoryItem key="div" tone="primary" label={<T en="Record dates ahead" bn="সামনে রেকর্ড ডেট" />}>
        {bn ? (
          <>
            {list}-এর রেকর্ড ডেট আগামী 30 দিনের মধ্যে। ডিভিডেন্ড পেতে রেকর্ড ডেটের আগেই শেয়ার আপনার হাতে থাকতে
            হবে।
          </>
        ) : (
          <>
            {list} have a record date in the next 30 days. To get the dividend, you need to own the shares
            before the record date.
          </>
        )}
      </StoryItem>,
    );
  }
  if (story.nearHigh.length > 0) {
    const list = inlineList(story.nearHigh.map((r) => r.trading_code));
    lookItems.push(
      <StoryItem key="highs" tone="warn" label={<T en="Near the year's high" bn="বছরের সর্বোচ্চের কাছে" />}>
        {bn ? (
          <>{list}-এর দাম গত এক বছরের সর্বোচ্চের 5%-এর মধ্যে। গতি ভালো, তবে এখানে দাম থেমে যেতে পারে।</>
        ) : (
          <>
            {list} trade within 5% of their highest price of the past year. The trend is strong, but the price
            may pause here.
          </>
        )}
      </StoryItem>,
    );
  }

  const riskItems: ReactNode[] = [];
  if (story.avoidCodes.length > 0) {
    const list = inlineList(story.avoidCodes);
    riskItems.push(
      <StoryItem key="weak" tone="bad" label={<T en="Weak grade" bn="দুর্বল গ্রেড" />}>
        {bn ? (
          <>{list}-এর স্কোর 45-এর নিচে। কেন এগুলো নজরে রাখছেন, আরেকবার ভেবে দেখুন।</>
        ) : (
          <>{list} score below 45. It is worth thinking again about why you follow them.</>
        )}
      </StoryItem>,
    );
  }
  if (story.weakBalance.length > 0) {
    const list = inlineList(story.weakBalance.map((r) => r.trading_code));
    riskItems.push(
      <StoryItem key="balance" tone="warn" label={<T en="Weak finances" bn="দুর্বল আর্থিক অবস্থা" />}>
        {bn ? (
          <>{list}-এর আর্থিক অবস্থার স্কোর কম, ঋণ বা নগদ টাকার ঘাটতির কারণে।</>
        ) : (
          <>{list} score low on financial health, because of loans or too little cash.</>
        )}
      </StoryItem>,
    );
  }
  if (story.overValued.length > 0) {
    const list = inlineList(story.overValued.map((r) => r.trading_code));
    riskItems.push(
      <StoryItem key="expensive" tone="warn" label={<T en="Looks expensive" bn="দাম বেশি মনে হচ্ছে" />}>
        {bn ? (
          <>{list}-এর দামের স্কোর কম। নিজেদের আগের দামের তুলনায় এগুলো দামি মনে হচ্ছে।</>
        ) : (
          <>{list} score low on price. They look expensive next to their own history.</>
        )}
      </StoryItem>,
    );
  }
  if (story.epsShrinkers.length > 0) {
    const list = inlineList(story.epsShrinkers.map((r) => r.trading_code));
    riskItems.push(
      <StoryItem key="shrink" tone="warn" label={<T en="Profit falling" bn="মুনাফা কমছে" />}>
        {bn ? (
          <>{list}-এর ইপিএস এক বছর আগের চেয়ে 10%-এর বেশি কমেছে।</>
        ) : (
          <>{list} reported profit per share more than 10% lower than a year ago.</>
        )}
      </StoryItem>,
    );
  }
  if (story.isConcentrated) {
    riskItems.push(
      <StoryItem key="concentration" tone="warn" label={<T en="Too much in one sector" bn="এক সেক্টরে বেশি" />}>
        {bn ? (
          <>
            আপনার তালিকার {concPct}% <span className="font-bold">{sectorName}</span> সেক্টরে। এই সেক্টরে বড় ধাক্কা
            এলে পুরো তালিকায় প্রভাব পড়বে।
          </>
        ) : (
          <>
            {concPct}% of your list is in <span className="font-bold">{sectorName}</span>. A shock to that sector
            would hit the whole list.
          </>
        )}
      </StoryItem>,
    );
  }

  const details = (
    <section className="wl-section" aria-labelledby="wl-standout">
      <SectionHeader
        id="wl-standout"
        title={<T en="What stands out" bn="যা চোখে পড়ার মতো" />}
        lead={
          <T
            en="Written from today's scores and prices. Tap a line to open it."
            bn="আজকের স্কোর আর দাম থেকে লেখা। খুলতে একটি সারিতে চাপ দিন।"
          />
        }
      />
      <Card padding="none" className="wl-folds">
        <Fold title="What's in your list" titleBn="আপনার তালিকায় কী আছে" count={basketItems.length}>
          <ul className="wl-story">{basketItems}</ul>
        </Fold>

        <Fold
          title="What moved today"
          titleBn="আজকের ওঠানামা"
          count={quietToday ? undefined : todayItems.length}
        >
          {quietToday ? (
            <p className="text-sm text-text-main">
              <T en="No price moves were recorded today." bn="আজ দামের কোনো ওঠানামা রেকর্ড হয়নি।" />
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold nums">
                <span className="text-positive">
                  ▲ <T en={`${story.upToday.length} up`} bn={`${story.upToday.length}টি বেড়েছে`} />
                </span>
                <span className="px-2 text-text-muted">·</span>
                <span className="text-text-muted">
                  <T en={`${story.flatToday} unchanged`} bn={`${story.flatToday}টি অপরিবর্তিত`} />
                </span>
                <span className="px-2 text-text-muted">·</span>
                <span className="text-negative">
                  ▼ <T en={`${story.downToday.length} down`} bn={`${story.downToday.length}টি কমেছে`} />
                </span>
              </p>
              <ul className="wl-story">{todayItems}</ul>
            </>
          )}
        </Fold>

        {lookItems.length > 0 && (
          <Fold
            title="Worth a second look"
            titleBn="আরেকবার দেখার মতো"
            count={lookItems.length}
            countTone="good"
          >
            <ul className="wl-story">{lookItems}</ul>
          </Fold>
        )}

        {riskItems.length > 0 && (
          <Fold
            title="Worth being careful about"
            titleBn="যেগুলোতে সাবধান থাকা ভালো"
            count={riskItems.length}
            countTone="bad"
          >
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
