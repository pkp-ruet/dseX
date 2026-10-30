"use client";

import { useMemo, type ReactNode } from "react";
import Card from "@/components/ui/Card";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { flattenTiers, type ScoreItem, type ScoresResponse, type WatchlistMeta } from "@/lib/api";
import { changePct, changeTone } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

/*
 * The watchlist hero: a mood word for today, one sentence on the list, then
 * ONE card with four answers and the quality mix. The "What stands out" folds
 * that sat under the table were replaced by the updates (WatchUpdates.tsx,
 * 2026-10-30). Styles: app/styles/watchlist.css, `wl-*`.
 */

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

interface Props {
  codes: string[];
  scores: ScoresResponse | null;
  /** Per-code "added on" meta — powers the "since you followed" answer. */
  meta?: WatchlistMeta;
}

type Leaning = "solid" | "risky" | "quality" | "balanced";

function avg(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export default function WatchlistAnalysis({ codes, scores, meta }: Props) {
  const codeSet = useMemo(() => new Set(codes.map((c) => c.toUpperCase())), [codes]);

  const rows = useMemo<ScoreItem[]>(() => {
    if (!scores) return [];
    return flattenTiers(scores).filter((it) => codeSet.has(it.trading_code.toUpperCase()));
  }, [scores, codeSet]);

  const story = useMemo(() => {
    if (!rows.length) return null;
    const tierCounts: Record<TierKey, number> = { excellent: 0, good: 0, average: 0, weak: 0 };
    for (const r of rows) tierCounts[getTier(r.score)] += 1;
    const qualityPct = ((tierCounts.excellent + tierCounts.good) / rows.length) * 100;
    const leaning: Leaning =
      qualityPct >= 70 ? "solid" : qualityPct <= 30 ? "risky" : qualityPct >= 50 ? "quality" : "balanced";
    const up = rows.filter((r) => (r.change_pct ?? 0) > 0).length;
    const down = rows.filter((r) => (r.change_pct ?? 0) < 0).length;
    // Average move since each stock was followed (codes with a price at add).
    const since = rows
      .map((r) => {
        const m = meta?.[r.trading_code.toUpperCase()];
        if (!m || m.price_at_add == null || m.price_at_add <= 0 || r.ltp == null) return null;
        return ((r.ltp - m.price_at_add) / m.price_at_add) * 100;
      })
      .filter((v): v is number => v != null);
    return {
      leaning,
      tierCounts,
      up,
      down,
      flat: rows.length - up - down,
      avgChg: avg(rows.map((r) => r.change_pct)),
      avgScore: avg(rows.map((r) => r.score)),
      sinceAvg: since.length ? since.reduce((a, b) => a + b, 0) / since.length : null,
      sinceN: since.length,
    };
  }, [rows, meta]);

  if (codes.length === 0) return null;

  if (!story) {
    return (
      <Card padding="md">
        <p className="text-sm text-text-main">
          <T en="None of the shares in your watchlist has a score yet." bn="আপনার ওয়াচলিস্টের কোনো শেয়ারের স্কোর এখনো তৈরি হয়নি।" />
        </p>
      </Card>
    );
  }

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

  return (
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
          {story.sinceAvg != null ? (
            <Answer
              q="Since you followed"
              qBn="যোগ করার পর"
              x={
                <T
                  en={`Average of ${story.sinceN} ${story.sinceN === 1 ? "share" : "shares"}`}
                  bn={`${story.sinceN}টি শেয়ারের গড়`}
                />
              }
            >
              <span className={changeTone(story.sinceAvg)}>{changePct(story.sinceAvg, 1)}</span>
            </Answer>
          ) : (
            <Answer q="Shares followed" qBn="মোট শেয়ার">
              {n}
            </Answer>
          )}
          <Answer q="Today" qBn="আজ" x={<T en="Average move" bn="গড় ওঠানামা" />}>
            <span className={changeTone(story.avgChg)}>{story.avgChg != null ? changePct(story.avgChg) : "—"}</span>
          </Answer>
          <Answer
            q="Up · down"
            qBn="বেড়েছে · কমেছে"
            x={
              story.flat > 0 ? (
                <T en={`${story.flat} unchanged`} bn={`${story.flat}টি অপরিবর্তিত`} />
              ) : (
                <T en="Every share moved" bn="সবগুলোর দাম বদলেছে" />
              )
            }
          >
            <span className="text-positive">{story.up}</span>
            <span className="px-1.5 font-normal text-text-muted">·</span>
            <span className="text-negative">{story.down}</span>
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
}
