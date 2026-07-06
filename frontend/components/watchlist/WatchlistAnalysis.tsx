"use client";

import { useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import {
  flattenTiers,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremesData,
  type DividendsUpcoming,
} from "@/lib/api";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Bengali helpers
// ---------------------------------------------------------------------------

// Bengali tier words come from the canonical map in lib/constants
// (Numbers inside Bengali prose stay Western — 9, 6.1% — per site convention.)

// ---------------------------------------------------------------------------
// Small building blocks
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
    <Link
      prefetch={false}
      href={`/stock/${code}`}
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 transition-colors mx-0.5"
    >
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
          {i < shown.length - 1 ? " " : ""}
        </span>
      ))}
      {codes.length > cap && (
        <span className="text-[var(--text-muted)] text-xs"> +{codes.length - cap} more</span>
      )}
    </>
  );
}

const ICONS = {
  pulse: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  ),
  basket: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  eye: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  alert: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

/** Card with a tinted header strip: icon chip + English title + Bengali subtitle. */
function Section({
  tone = "primary",
  icon,
  title,
  titleBn,
  children,
}: {
  tone?: Tone;
  icon: React.ReactNode;
  title: string;
  titleBn: string;
  children: React.ReactNode;
}) {
  const c = TONE_COLOR[tone];
  return (
    <Card padding="none" className="overflow-hidden">
      <div
        className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3 sm:px-5"
        style={{ background: `color-mix(in srgb, ${c} 5%, var(--surface))` }}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{
            color: c,
            background: `color-mix(in srgb, ${c} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${c} 22%, var(--border))`,
          }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-sm sm:text-[15px] font-bold leading-tight text-[var(--text)]">
            {title}
          </h3>
          <p lang="bn" className="font-bn text-xs font-semibold leading-snug text-[var(--text-muted)]">
            {titleBn}
          </p>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </Card>
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
    <li className="flex gap-2.5">
      <span
        className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
        style={{ background: TONE_COLOR[tone] }}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-[var(--text)]">
          <span className="font-bold">{label}:</span> {children}
        </p>
        {bn && (
          <p lang="bn" className="font-bn mt-0.5 text-[13px] font-medium leading-relaxed text-[var(--text-muted)]">
            {bn}
          </p>
        )}
      </div>
    </li>
  );
}

function StatTile({
  label,
  labelBn,
  value,
  color,
}: {
  label: string;
  labelBn: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold nums leading-tight" style={color ? { color } : { color: "var(--text)" }}>
        {value}
      </div>
      <div lang="bn" className="font-bn text-[11px] font-semibold leading-tight text-[var(--text-muted)]">
        {labelBn}
      </div>
    </div>
  );
}

function MoodGauge({ value }: { value: number | null }) {
  if (value == null) return null;
  const clamp = Math.max(-3, Math.min(3, value));
  const pos = ((clamp + 3) / 6) * 100;
  const tone =
    value > 0.5 ? "var(--positive)" : value < -0.5 ? "var(--negative)" : "var(--watch)";
  const mood = value > 0.5 ? "Bullish" : value < -0.5 ? "Bearish" : "Mixed";
  const moodBn = value > 0.5 ? "চাঙা ভাব" : value < -0.5 ? "চাপের মধ্যে" : "মিশ্র অবস্থা";
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div
          className="relative h-2 rounded-full"
          style={{
            background:
              "linear-gradient(to right, color-mix(in srgb, var(--negative) 40%, transparent), color-mix(in srgb, var(--watch) 40%, transparent), color-mix(in srgb, var(--positive) 40%, transparent))",
          }}
        >
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[var(--bg)] shadow-sm"
            style={{ left: `calc(${pos}% - 7px)`, background: tone }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-semibold text-[var(--text-muted)] nums">
          <span>−3%</span>
          <span>0</span>
          <span>+3%</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold nums" style={{ color: tone }}>
          {mood} {value > 0 ? "+" : ""}
          {value.toFixed(2)}%
        </div>
        <div lang="bn" className="font-bn text-[11px] font-semibold text-[var(--text-muted)]">
          {moodBn}
        </div>
      </div>
    </div>
  );
}

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

function TierMixBar({ counts, total }: { counts: Record<TierKey, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Quality mix
        </span>
        <span lang="bn" className="font-bn text-[11px] font-semibold text-[var(--text-muted)]">
          কোন মানের স্টক কয়টা
        </span>
      </div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
        {TIER_ORDER.filter((t) => counts[t] > 0).map((t) => (
          <div
            key={t}
            style={{ width: `${(counts[t] / total) * 100}%`, background: TIER_VAR[t] }}
            title={`${TIER_LABELS[t]}: ${counts[t]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {TIER_ORDER.filter((t) => counts[t] > 0).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]">
            <span className="h-2 w-2 rounded-full" style={{ background: TIER_VAR[t] }} aria-hidden />
            {TIER_LABELS[t]}
            <span lang="bn" className="font-bn text-[var(--text-muted)]">
              ({TIER_LABELS_BN[t]})
            </span>
            <span className="nums">{counts[t]}</span>
          </span>
        ))}
      </div>
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
}

export default function WatchlistAnalysis({ codes, scores, extremes, dividends }: Props) {
  const codeSet = useMemo(() => new Set(codes.map((c) => c.toUpperCase())), [codes]);

  const rows = useMemo<ScoreItem[]>(() => {
    if (!scores) return [];
    return flattenTiers(scores)
      .filter((it) => codeSet.has(it.trading_code.toUpperCase()))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [scores, codeSet]);

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

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)]">
          Watchlist Story
        </h2>
        <p lang="bn" className="font-bn text-[13px] font-semibold leading-snug text-[var(--text-muted)]">
          আপনার তালিকার আজকের গল্প — সহজ ভাষায়
        </p>
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">
        Auto-generated · not investment advice
      </span>
    </div>
  );

  if (!rows.length || !story) {
    return (
      <section className="mt-8 flex flex-col gap-3">
        {header}
        <Card padding="none" className="p-5">
          <p className="text-sm text-[var(--text)]">No scored stocks in your watchlist yet.</p>
          <p lang="bn" className="font-bn mt-1 text-[13px] font-medium text-[var(--text-muted)]">
            আপনার তালিকার স্টকগুলোর স্কোর এখনো তৈরি হয়নি।
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mt-8 flex flex-col gap-3">
      {header}

      {/* 1. Snapshot — headline, mood, stat tiles, tier mix */}
      <Card padding="none" className="p-4 sm:p-5">
        <p className="text-base sm:text-lg font-semibold leading-relaxed text-[var(--text)]">
          {story.headline}
        </p>
        <p lang="bn" className="font-bn mt-1.5 text-[15px] font-semibold leading-relaxed text-[var(--text)]">
          {story.headlineBn}
        </p>

        <div className="mt-4">
          <MoodGauge value={story.avgChg} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Stocks" labelBn="মোট স্টক" value={String(rows.length)} />
          <StatTile
            label="Avg score"
            labelBn="গড় স্কোর"
            value={story.avgScore != null ? String(Math.round(story.avgScore)) : "—"}
            color={story.avgScore != null ? TIER_VAR[getTier(story.avgScore)] : undefined}
          />
          <StatTile
            label="Up today"
            labelBn="আজ বেড়েছে"
            value={String(story.upToday.length)}
            color="var(--positive)"
          />
          <StatTile
            label="Down today"
            labelBn="আজ কমেছে"
            value={String(story.downToday.length)}
            color="var(--negative)"
          />
        </div>

        <div className="mt-4">
          <TierMixBar counts={story.tierCounts} total={rows.length} />
        </div>
      </Card>

      {/* 2. Composition — what kind of basket this is */}
      <Section
        icon={ICONS.basket}
        title="What's in your basket"
        titleBn="আপনার ঝুড়িতে কী আছে"
      >
        <ul className="flex flex-col gap-3">
          <StoryItem
            tone={story.qualityPct >= 50 ? "good" : "warn"}
            label={`${Math.round(story.qualityPct)}% quality`}
            bn={`${rows.length}টির মধ্যে ${story.qualityCount}টি স্টক ভালো মানের (Excellent বা Good)।`}
          >
            {story.qualityCount} of {rows.length} stocks rate Excellent or Good
            {story.tierCodes.excellent.length > 0 && (
              <>. Best of the lot: {inlineList(story.tierCodes.excellent.slice(0, 3))}</>
            )}
            .
          </StoryItem>

          {story.topScorer && (
            <StoryItem
              tone="primary"
              label="Strongest vs weakest"
              bn={`সবচেয়ে শক্ত ${story.topScorer.trading_code}${story.bottomScorer ? `, সবচেয়ে দুর্বল ${story.bottomScorer.trading_code}` : ""}।`}
            >
              <CodeChip code={story.topScorer.trading_code} /> leads with score{" "}
              <span className="font-bold nums">{Math.round(story.topScorer.score!)}</span>
              {story.bottomScorer && (
                <>
                  , while <CodeChip code={story.bottomScorer.trading_code} /> sits at the bottom
                  with <span className="font-bold nums">{Math.round(story.bottomScorer.score!)}</span>
                </>
              )}
              .
            </StoryItem>
          )}

          {story.dominantSector && (
            <StoryItem
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
            </StoryItem>
          )}

          <StoryItem
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
                {story.dividendPayers.length === 1 ? "" : "s"}, {story.epsGrowers.length} fast
                grower{story.epsGrowers.length === 1 ? "" : "s"}.
              </>
            )}
          </StoryItem>

          {(story.nearHigh.length > 0 || story.nearLow.length > 0) && (
            <StoryItem
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
            </StoryItem>
          )}
        </ul>
      </Section>

      {/* 3. Today's action */}
      <Section icon={ICONS.pulse} title="What moved today" titleBn="আজ কী নড়ল">
        {story.upToday.length === 0 && story.downToday.length === 0 ? (
          <>
            <p className="text-sm text-[var(--text)]">No price action recorded today.</p>
            <p lang="bn" className="font-bn mt-1 text-[13px] font-medium text-[var(--text-muted)]">
              আজ কোনো দামের নড়াচড়া রেকর্ড হয়নি।
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] px-2 py-0.5 text-[11px] font-bold text-[var(--positive)] nums">
                ▲ {story.upToday.length} up
              </span>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-muted)] nums">
                {story.flatToday} flat
              </span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--negative)_12%,transparent)] px-2 py-0.5 text-[11px] font-bold text-[var(--negative)] nums">
                ▼ {story.downToday.length} down
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {story.topGainer && (
                <StoryItem tone="good" label="Best">
                  <CodeChip code={story.topGainer.trading_code} /> led the gainers, up{" "}
                  <span className="font-bold text-[var(--positive)] nums">
                    +{story.topGainer.change_pct!.toFixed(2)}%
                  </span>
                  .
                </StoryItem>
              )}
              {story.topLoser && (
                <StoryItem tone="bad" label="Worst">
                  <CodeChip code={story.topLoser.trading_code} /> dragged, off{" "}
                  <span className="font-bold text-[var(--negative)] nums">
                    {story.topLoser.change_pct!.toFixed(2)}%
                  </span>
                  .
                </StoryItem>
              )}
              {story.upToday.length > story.downToday.length * 2 && story.upToday.length >= 3 && (
                <StoryItem tone="good" label="Breadth">
                  Broad-based strength — most of your list closed green.
                </StoryItem>
              )}
              {story.downToday.length > story.upToday.length * 2 && story.downToday.length >= 3 && (
                <StoryItem tone="bad" label="Breadth">
                  Broad-based weakness — selling pressure across most of your list.
                </StoryItem>
              )}
            </ul>
            <p lang="bn" className="font-bn mt-3 border-t border-[var(--border)] pt-3 text-[13px] font-medium leading-relaxed text-[var(--text-muted)]">
              {story.todayBn}
            </p>
          </>
        )}
      </Section>

      {/* 4. Opportunities */}
      {(story.valuePlays.length > 0 ||
        story.qualityOnSale.length > 0 ||
        story.dueDividends.length > 0 ||
        story.nearHigh.length > 0) && (
        <Section
          tone="good"
          icon={ICONS.eye}
          title="Worth a second look"
          titleBn="নজরে রাখার মতো"
        >
          <ul className="flex flex-col gap-3">
            {story.qualityOnSale.length > 0 && (
              <StoryItem
                tone="good"
                label="Quality on sale"
                bn="ভালো স্কোরের স্টক এখন বছরের সর্বনিম্ন দামের কাছে — সস্তায় কেনার সুযোগ হতে পারে, তবে আগে যাচাই করুন।"
              >
                {inlineList(story.qualityOnSale.map((r) => r.trading_code))} rate Excellent or
                Good AND trade within 5% of the 52-week low — a possible bargain if the business
                still looks healthy.
              </StoryItem>
            )}
            {story.valuePlays.length > 0 && story.qualityOnSale.length === 0 && (
              <StoryItem
                tone="good"
                label="High score, low price"
                bn="স্কোর 60-এর বেশি, কিন্তু দাম বছরের সর্বনিম্নের কাছে।"
              >
                {inlineList(story.valuePlays.map((r) => r.trading_code))} score 60+ and sit near
                52-week lows.
              </StoryItem>
            )}
            {story.dueDividends.length > 0 && (
              <StoryItem
                tone="primary"
                label="Dividend dates ahead"
                bn="আগামী 30 দিনের মধ্যে রেকর্ড ডেট — ডিভিডেন্ড পেতে হলে ওই দিনের আগে শেয়ার ধরে রাখতে হবে।"
              >
                {inlineList(story.dueDividends.map((d) => d.code))} have record dates in the next
                30 days — hold before the record date to get the dividend.
              </StoryItem>
            )}
            {story.nearHigh.length > 0 && (
              <StoryItem
                tone="warn"
                label="Pushing highs"
                bn="বছরের সর্বোচ্চ দামের কাছাকাছি — গতি ভালো, তবে এখান থেকে দাম আটকে যেতেও পারে।"
              >
                {inlineList(story.nearHigh.map((r) => r.trading_code))} trade within 5% of the
                52-week high — momentum is strong, but the price may pause here.
              </StoryItem>
            )}
          </ul>
        </Section>
      )}

      {/* 5. Risks */}
      {(story.avoidCodes.length > 0 ||
        story.weakBalance.length > 0 ||
        story.overValued.length > 0 ||
        story.epsShrinkers.length > 0 ||
        story.isConcentrated) && (
        <Section tone="bad" icon={ICONS.alert} title="Heads up" titleBn="একটু সাবধান">
          <ul className="flex flex-col gap-3">
            {story.avoidCodes.length > 0 && (
              <StoryItem
                tone="bad"
                label="Weak tier"
                bn="এই স্টকগুলোর স্কোর 45-এর নিচে — কেন রেখেছেন, আরেকবার ভেবে দেখুন।"
              >
                {inlineList(story.avoidCodes)} score below 45 — review why you hold them, or
                consider trimming.
              </StoryItem>
            )}
            {story.weakBalance.length > 0 && (
              <StoryItem
                tone="warn"
                label="Weak balance sheet"
                bn="এই কোম্পানিগুলোর ধারদেনা বা নগদ টাকার অবস্থা দুর্বল।"
              >
                {inlineList(story.weakBalance.map((r) => r.trading_code))} score low on financial
                health — debt or cash position is a worry.
              </StoryItem>
            )}
            {story.overValued.length > 0 && (
              <StoryItem
                tone="warn"
                label="Looks expensive"
                bn="নিজেদের ইতিহাসের তুলনায় এই স্টকগুলোর দাম বেশি মনে হচ্ছে।"
              >
                {inlineList(story.overValued.map((r) => r.trading_code))} score low on valuation —
                the price looks stretched vs their own history.
              </StoryItem>
            )}
            {story.epsShrinkers.length > 0 && (
              <StoryItem
                tone="warn"
                label="Earnings shrinking"
                bn="এই কোম্পানিগুলোর আয় আগের বছরের চেয়ে কমেছে।"
              >
                {inlineList(story.epsShrinkers.map((r) => r.trading_code))} posted EPS drops &gt;
                10% year-on-year.
              </StoryItem>
            )}
            {story.isConcentrated && (
              <StoryItem
                tone="warn"
                label="Concentration risk"
                bn="একটাই খাতে অনেক বেশি স্টক — খাতটা খারাপ করলে পুরো তালিকা একসাথে ভুগবে।"
              >
                {Math.round(story.sectorConcentrationPct)}% of your list sits in{" "}
                <span className="font-bold">{story.dominantSector?.[0]}</span>. One sector shock
                would hurt the whole list.
              </StoryItem>
            )}
          </ul>
        </Section>
      )}

      <p lang="bn" className="font-bn text-center text-[11px] font-medium text-[var(--text-muted)]">
        এই বিশ্লেষণ স্বয়ংক্রিয়ভাবে তৈরি — বিনিয়োগের সিদ্ধান্তের আগে নিজে যাচাই করে নিন।
      </p>
    </section>
  );
}
