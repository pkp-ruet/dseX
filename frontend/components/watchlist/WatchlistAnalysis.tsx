"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import {
  getScores,
  getNearExtremes,
  getDividendsUpcoming,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremesData,
  type DividendsUpcoming,
} from "@/lib/api";

type Tier = "strong_buy" | "safe_buy" | "watch" | "avoid";

const TIER_LABEL: Record<Tier, string> = {
  strong_buy: "Strong Buy",
  safe_buy: "Safe Buy",
  watch: "Watch",
  avoid: "Avoid",
};

function tierOf(scores: ScoresResponse | null, code: string): Tier | null {
  if (!scores) return null;
  const c = code.toUpperCase();
  for (const k of ["strong_buy", "safe_buy", "watch", "avoid"] as Tier[]) {
    if (scores.tiers[k].some((it) => it.trading_code.toUpperCase() === c)) return k;
  }
  return null;
}

function CodeChip({ code }: { code: string }) {
  return (
    <Link
      prefetch={false} href={`/stock/${code}`}
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
        <span className="text-[var(--ink-muted)] text-xs"> +{codes.length - cap} more</span>
      )}
    </>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="none" className="p-4 sm:p-5">
      {(eyebrow || title) && (
        <div className="mb-3">
          {eyebrow && (
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--primary)]">
              {eyebrow}
            </div>
          )}
          {title && (
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] mt-0.5">
              {title}
            </h3>
          )}
        </div>
      )}
      {children}
    </Card>
  );
}

function MoodGauge({ value }: { value: number | null }) {
  // value = avg change pct in watchlist today
  if (value == null) return null;
  // map -3..+3 to 0..100
  const clamp = Math.max(-3, Math.min(3, value));
  const pos = ((clamp + 3) / 6) * 100;
  const tone =
    value > 0.5
      ? "text-[var(--positive)]"
      : value < -0.5
        ? "text-[var(--negative)]"
        : "text-[var(--watch)]";
  const mood =
    value > 0.5 ? "Bullish" : value < -0.5 ? "Bearish" : "Mixed";
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex-1 h-2 rounded-full"
        style={{
          background:
            "linear-gradient(to right, color-mix(in srgb, var(--negative) 40%, transparent), color-mix(in srgb, var(--watch) 40%, transparent), color-mix(in srgb, var(--positive) 40%, transparent))",
        }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[var(--ink)] border-2 border-[var(--bg)]"
          style={{ left: `calc(${pos}% - 6px)` }}
        />
      </div>
      <div className={`text-sm font-bold nums ${tone}`}>
        {mood} {value > 0 ? "+" : ""}{value.toFixed(2)}%
      </div>
    </div>
  );
}

export default function WatchlistAnalysis({ codes }: { codes: string[] }) {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [extremes, setExtremes] = useState<NearExtremesData | null>(null);
  const [dividends, setDividends] = useState<DividendsUpcoming | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([getScores(), getNearExtremes(), getDividendsUpcoming()])
      .then(([s, e, d]) => {
        if (cancelled) return;
        if (s.status === "fulfilled") setScores(s.value);
        if (e.status === "fulfilled") setExtremes(e.value);
        if (d.status === "fulfilled") setDividends(d.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const codeSet = useMemo(() => new Set(codes.map((c) => c.toUpperCase())), [codes]);

  const rows = useMemo<ScoreItem[]>(() => {
    if (!scores) return [];
    const flat = [
      ...scores.tiers.strong_buy,
      ...scores.tiers.safe_buy,
      ...scores.tiers.watch,
      ...scores.tiers.avoid,
    ];
    return flat
      .filter((it) => codeSet.has(it.trading_code.toUpperCase()))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [scores, codeSet]);

  const story = useMemo(() => {
    if (!rows.length || !scores) return null;

    // Tier mix
    const tierCounts: Record<Tier, number> = { strong_buy: 0, safe_buy: 0, watch: 0, avoid: 0 };
    const tierCodes: Record<Tier, string[]> = { strong_buy: [], safe_buy: [], watch: [], avoid: [] };
    for (const r of rows) {
      const t = tierOf(scores, r.trading_code);
      if (t) {
        tierCounts[t] += 1;
        tierCodes[t].push(r.trading_code);
      }
    }
    const qualityCount = tierCounts.strong_buy + tierCounts.safe_buy;
    const qualityPct = (qualityCount / rows.length) * 100;

    // Avg score + today
    const scoreVals = rows.map((r) => r.score).filter((v): v is number => v != null);
    const avgScore = scoreVals.length ? scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length : null;
    const chgVals = rows.map((r) => r.change_pct).filter((v): v is number => v != null);
    const avgChg = chgVals.length ? chgVals.reduce((a, b) => a + b, 0) / chgVals.length : null;

    // Breadth today
    const upToday = rows.filter((r) => (r.change_pct ?? 0) > 0);
    const downToday = rows.filter((r) => (r.change_pct ?? 0) < 0);
    const flatToday = rows.length - upToday.length - downToday.length;

    // Today's biggest mover
    const byChg = rows
      .filter((r) => r.change_pct != null)
      .sort((a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!));
    const biggestMove = byChg[0] ?? null;
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
      .sort((a, b) => (b.div_yield_pct! - a.div_yield_pct!))[0] ?? null;

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

    // Quality on sale: tier strong/safe buy near low
    const qualityOnSale = nearLow.filter((r) => {
      const t = tierOf(scores, r.trading_code);
      return t === "strong_buy" || t === "safe_buy";
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
    const avoidCodes = tierCodes.avoid;
    const weakBalance = rows.filter((r) => (r.p2_health ?? 10) < 4);
    const overValued = rows.filter((r) => (r.p4_val ?? 10) < 4);

    // Concentration
    const isConcentrated = rows.length >= 5 && sectorConcentrationPct >= 50;

    // Headline narrative
    let leaning = "balanced";
    if (qualityPct >= 70) leaning = "defensive";
    else if (qualityPct <= 30) leaning = "speculative";
    else if (qualityPct >= 50) leaning = "tilted toward quality";

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

    return {
      headline,
      avgScore,
      avgChg,
      tierCounts,
      tierCodes,
      qualityPct,
      upToday,
      downToday,
      flatToday,
      biggestMove,
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

  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)] mb-3">
          Watchlist Story
        </h2>
        <Card padding="none" className="p-5 text-sm text-[var(--ink-muted)]">
          Reading the tape…
        </Card>
      </section>
    );
  }

  if (!rows.length || !story) {
    return (
      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)] mb-3">
          Watchlist Story
        </h2>
        <Card padding="none" className="p-5 text-sm text-[var(--ink-muted)]">
          No scored stocks in your watchlist yet.
        </Card>
      </section>
    );
  }

  return (
    <section className="mt-8 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)]">
          Watchlist Story
        </h2>
        <span className="text-[10px] text-[var(--ink-muted)]">
          Auto-generated · not investment advice
        </span>
      </div>

      {/* 1. Headline + mood gauge */}
      <Section>
        <p className="text-base sm:text-lg font-semibold text-[var(--ink)] leading-relaxed">
          {story.headline}
        </p>
        <div className="mt-4">
          <MoodGauge value={story.avgChg} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
          <span>
            <span className="font-semibold text-[var(--positive)] nums">{story.upToday.length}</span> up
          </span>
          <span>
            <span className="font-semibold text-[var(--ink-muted)] nums">{story.flatToday}</span> flat
          </span>
          <span>
            <span className="font-semibold text-[var(--negative)] nums">{story.downToday.length}</span> down
          </span>
        </div>
      </Section>

      {/* 2. Composition — what kind of portfolio */}
      <Section eyebrow="Composition" title="What's in your basket">
        <div className="flex flex-col gap-3 text-sm text-[var(--ink)] leading-relaxed">
          {/* Quality */}
          <p>
            <span className="font-bold">{Math.round(story.qualityPct)}% quality:</span>{" "}
            {story.tierCounts.strong_buy + story.tierCounts.safe_buy} of {rows.length} stocks rank
            Strong or Safe Buy
            {story.tierCounts.strong_buy > 0 && (
              <>
                . Best of the lot:{" "}
                {inlineList(story.tierCodes.strong_buy.slice(0, 3))}
              </>
            )}
            .
          </p>

          {/* Sector tilt */}
          {story.dominantSector && (
            <p>
              <span className="font-bold">Sector tilt:</span>{" "}
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
            </p>
          )}

          {/* Income vs growth */}
          <p>
            <span className="font-bold">Personality:</span>{" "}
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
                    , fastest is <CodeChip code={story.bestGrower.trading_code} /> at{" "}
                    +{story.bestGrower.eps_yoy_pct.toFixed(0)}%
                  </>
                )}
                .
              </>
            ) : (
              <>
                Mixed — {story.dividendPayers.length} dividend payer
                {story.dividendPayers.length === 1 ? "" : "s"},{" "}
                {story.epsGrowers.length} fast grower
                {story.epsGrowers.length === 1 ? "" : "s"}.
              </>
            )}
          </p>
        </div>
      </Section>

      {/* 3. Today's tape */}
      <Section eyebrow="Today" title="What moved">
        {story.upToday.length === 0 && story.downToday.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No price action recorded today.</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-[var(--ink)] leading-relaxed">
            {story.topGainer && (
              <p>
                <span className="text-[var(--positive)] font-bold">▲ Best:</span>{" "}
                <CodeChip code={story.topGainer.trading_code} /> led the gainers, up{" "}
                <span className="font-bold text-[var(--positive)] nums">
                  +{story.topGainer.change_pct!.toFixed(2)}%
                </span>
                .
              </p>
            )}
            {story.topLoser && (
              <p>
                <span className="text-[var(--negative)] font-bold">▼ Worst:</span>{" "}
                <CodeChip code={story.topLoser.trading_code} /> dragged, off{" "}
                <span className="font-bold text-[var(--negative)] nums">
                  {story.topLoser.change_pct!.toFixed(2)}%
                </span>
                .
              </p>
            )}
            {story.upToday.length > story.downToday.length * 2 &&
              story.upToday.length >= 3 && (
                <p className="text-[var(--ink-muted)]">
                  Broad-based strength — most of your list closed green.
                </p>
              )}
            {story.downToday.length > story.upToday.length * 2 &&
              story.downToday.length >= 3 && (
                <p className="text-[var(--ink-muted)]">
                  Broad-based weakness — selling pressure across most of your list.
                </p>
              )}
          </div>
        )}
      </Section>

      {/* 4. Hidden gems / opportunities */}
      {(story.valuePlays.length > 0 ||
        story.qualityOnSale.length > 0 ||
        story.dueDividends.length > 0 ||
        story.nearHigh.length > 0) && (
        <Section eyebrow="Watch closely" title="Setups worth a second look">
          <div className="flex flex-col gap-2 text-sm text-[var(--ink)] leading-relaxed">
            {story.qualityOnSale.length > 0 && (
              <p>
                <span className="font-bold">Quality on sale:</span>{" "}
                {inlineList(story.qualityOnSale.map((r) => r.trading_code))}{" "}
                rank Strong/Safe Buy AND trade within 5% of 52-week low — potential
                value setup if fundamentals still hold.
              </p>
            )}
            {story.valuePlays.length > 0 && story.qualityOnSale.length === 0 && (
              <p>
                <span className="font-bold">High-score, low-price:</span>{" "}
                {inlineList(story.valuePlays.map((r) => r.trading_code))}{" "}
                score 60+ and sit near 52-week lows.
              </p>
            )}
            {story.dueDividends.length > 0 && (
              <p>
                <span className="font-bold">Dividend record dates ahead:</span>{" "}
                {inlineList(story.dueDividends.map((d) => d.code))} in the next 30 days —
                hold before the record date to capture.
              </p>
            )}
            {story.nearHigh.length > 0 && (
              <p>
                <span className="font-bold">Pushing highs:</span>{" "}
                {inlineList(story.nearHigh.map((r) => r.trading_code))}{" "}
                trade within 5% of 52-week high — momentum solid, but watch for
                resistance.
              </p>
            )}
          </div>
        </Section>
      )}

      {/* 5. Risks */}
      {(story.avoidCodes.length > 0 ||
        story.weakBalance.length > 0 ||
        story.overValued.length > 0 ||
        story.epsShrinkers.length > 0 ||
        story.isConcentrated) && (
        <Section eyebrow="Heads up" title="Risks in your list">
          <div className="flex flex-col gap-2 text-sm text-[var(--ink)] leading-relaxed">
            {story.avoidCodes.length > 0 && (
              <p>
                <span className="font-bold text-[var(--negative)]">Avoid-tier:</span>{" "}
                {inlineList(story.avoidCodes)} score below 45 — review the
                thesis or consider trimming.
              </p>
            )}
            {story.weakBalance.length > 0 && (
              <p>
                <span className="font-bold text-[var(--watch)]">Weak balance sheet:</span>{" "}
                {inlineList(story.weakBalance.map((r) => r.trading_code))} score low on
                Financial Health — debt or cash position is a worry.
              </p>
            )}
            {story.overValued.length > 0 && (
              <p>
                <span className="font-bold text-[var(--watch)]">Looks expensive:</span>{" "}
                {inlineList(story.overValued.map((r) => r.trading_code))} score low on
                Valuation — price stretched vs own history.
              </p>
            )}
            {story.epsShrinkers.length > 0 && (
              <p>
                <span className="font-bold text-[var(--watch)]">Earnings shrinking:</span>{" "}
                {inlineList(story.epsShrinkers.map((r) => r.trading_code))} posted EPS
                drops &gt; 10% YoY.
              </p>
            )}
            {story.isConcentrated && (
              <p>
                <span className="font-bold text-[var(--watch)]">Concentration risk:</span>{" "}
                {Math.round(story.sectorConcentrationPct)}% of your list sits in{" "}
                <span className="font-bold">{story.dominantSector?.[0]}</span>. One
                sector shock would hurt the whole portfolio.
              </p>
            )}
          </div>
        </Section>
      )}
    </section>
  );
}
