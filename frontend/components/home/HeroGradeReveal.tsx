"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { type TierKey, TIER_VAR, TIER_MEANINGS_BN } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";

/** One stock the hero demo cycles through. Built server-side in `app/page.tsx`. */
export interface HeroStock {
  code: string;
  name: string;
  sector: string | null;
  score: number;
  tier: TierKey;
  signal: "buy" | "none";
  strength: "strong" | "normal" | null;
  reasonBn: string;
  ltp: number | null;
  changePct: number | null;
}

const PHASES = ["typing", "reveal", "tier", "signal"] as const;
type Phase = (typeof PHASES)[number];

const spring = { type: "spring" as const, stiffness: 360, damping: 22 };

/**
 * The hero's 3-second "aha": types a real stock code into a demo search, fills
 * its 0–100 score ring, snaps in the tier, then slides in the Buy chip + a
 * plain-Bangla reason — looping through a few stocks.
 *
 * First paint (SSR + hydration) renders stock[0] fully composed, so the code,
 * score, tier and reason are all in the server HTML (SEO-safe) and there's no
 * flash on hydration. The loop then holds that card before cycling on.
 * Degrades to a single static card under reduced-motion / a single stock, and
 * pauses when off-screen or the tab is hidden (mobile battery).
 */
export default function HeroGradeReveal({ stocks }: { stocks: HeroStock[] }) {
  const reduced = useReducedMotion();
  const first = stocks[0];

  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(first?.code ?? "");
  const [displayScore, setDisplayScore] = useState(first?.score ?? 0);
  const [phase, setPhase] = useState<Phase>("signal");

  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Pause the loop when scrolled out of view (saves mobile battery/CPU).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause when the tab is backgrounded.
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (reduced || stocks.length < 2 || !inView || !visible) return;
    let cancelled = false;
    const timers: number[] = [];
    let raf = 0;

    const delay = (ms: number) =>
      new Promise<void>((res) => {
        timers.push(window.setTimeout(res, ms));
      });

    const countUp = (target: number, dur = 750) =>
      new Promise<void>((res) => {
        let startTs: number | null = null;
        const step = (ts: number) => {
          if (cancelled) return res();
          if (startTs == null) startTs = ts;
          const p = Math.min((ts - startTs) / dur, 1);
          setDisplayScore(Math.round(target * p));
          if (p < 1) raf = requestAnimationFrame(step);
          else res();
        };
        raf = requestAnimationFrame(step);
      });

    const playStock = async (i: number) => {
      const s = stocks[i];
      if (!s) return;
      setIndex(i);
      setPhase("typing");
      setTyped("");
      setDisplayScore(0);
      await delay(450);
      for (let c = 1; c <= s.code.length; c++) {
        if (cancelled) return;
        setTyped(s.code.slice(0, c));
        await delay(85);
      }
      await delay(300);
      if (cancelled) return;
      setPhase("reveal");
      await countUp(s.score);
      if (cancelled) return;
      setPhase("tier");
      await delay(480);
      if (cancelled) return;
      setPhase("signal");
      await delay(2400);
    };

    (async () => {
      // Stock[0] is already composed on screen (matches SSR) — hold it, then cycle.
      await delay(2600);
      let i = 1 % stocks.length;
      while (!cancelled) {
        await playStock(i);
        i = (i + 1) % stocks.length;
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      cancelAnimationFrame(raf);
    };
  }, [stocks, reduced, inView, visible]);

  if (!first) return null;

  const cur = stocks[index] ?? first;
  const rank = PHASES.indexOf(phase);
  const isTyping = phase === "typing";
  const showTier = rank >= 2;
  const showSignal = rank >= 3;
  const color = TIER_VAR[cur.tier];
  const chgUp = (cur.changePct ?? 0) >= 0;

  return (
    <div
      ref={rootRef}
      className="w-full"
      aria-label="Live example — how any DSE stock gets graded on TopStockBD"
    >
      {/* Faux search field — visibly a demo, distinct from the real search on the left */}
      <div className="flex items-center gap-2.5 rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--text-muted)]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="flex-1 min-w-0 font-mono text-[0.9rem] font-bold tracking-[0.04em] text-[var(--text)]">
          {typed || cur.code}
          <m.span
            aria-hidden
            className="inline-block w-[2px] -mb-[2px] h-[1.05em] ml-[1px] align-middle bg-[var(--primary)]"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
          />
        </span>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[var(--primary-ink)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          </span>
          Live demo
        </span>
      </div>

      {/* Result panel — fixed min-height so cycling reasons don't shift layout */}
      <div className="relative rounded-b-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden min-h-[268px]">
        {isTyping ? (
          <div className="flex h-[268px] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="h-[76px] w-[76px] rounded-full border-4 border-[var(--surface-2)] border-t-[var(--primary)] animate-spin" />
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Reading <span className="font-mono font-bold text-[var(--text)]">{typed || cur.code}</span>&apos;s numbers…
            </p>
          </div>
        ) : (
          <m.div
            key={index}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="p-4 sm:p-5"
          >
            {/* Identity + score ring */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">
                  Fundamental score · 0–100
                </span>
                <div className="font-extrabold text-base text-[var(--text)] leading-tight truncate">
                  {cur.name}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="font-mono font-bold text-xs px-2 py-0.5 rounded-md border"
                    style={{
                      color,
                      background: `color-mix(in srgb, ${color} 11%, transparent)`,
                      borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
                    }}
                  >
                    {cur.code}
                  </span>
                  {cur.sector && (
                    <span className="text-[0.68rem] text-[var(--text-muted)] truncate">{cur.sector}</span>
                  )}
                </div>
              </div>
              <ScoreBadge score={displayScore} tier={cur.tier} size="lg" className="shrink-0" />
            </div>

            {/* Price + tier */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold tabular-nums nums text-[var(--text)]">
                  {cur.ltp != null ? `৳${cur.ltp.toFixed(2)}` : "--"}
                </span>
                {cur.changePct != null && (
                  <span
                    className="text-sm font-bold tabular-nums nums"
                    style={{ color: chgUp ? "var(--positive)" : "var(--negative)" }}
                  >
                    {chgUp ? "▲" : "▼"} {chgUp ? "+" : ""}
                    {cur.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
              {showTier && (
                <m.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
                  <TierPill tier={cur.tier} size="md" />
                </m.div>
              )}
            </div>

            {/* Verdict — Buy chip + plain-Bangla reason (or tier meaning) */}
            <div className="mt-4 rounded-[var(--radius)] bg-[var(--surface-2)] px-3.5 py-3 min-h-[64px]">
              {showSignal ? (
                <m.div
                  initial={{ x: 14, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-2">
                    {cur.signal === "buy" ? (
                      <SignalChip signal="buy" strength={cur.strength} size="md" lang="bn" />
                    ) : (
                      <span
                        className="inline-flex items-center rounded-md px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide"
                        style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                      >
                        {TIER_MEANINGS_BN[cur.tier]}
                      </span>
                    )}
                  </div>
                  <p lang="bn" className="font-bn mt-1.5 text-[0.86rem] leading-snug text-[var(--text)]">
                    {cur.reasonBn}
                  </p>
                </m.div>
              ) : (
                <div className="flex h-full items-center">
                  <span className="text-[0.8rem] text-[var(--text-muted)]">Weighing the verdict…</span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </div>

      {/* Progress dots + real link out */}
      <div className="mt-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5" aria-hidden>
          {stocks.map((s, i) => (
            <span
              key={s.code}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 16 : 6,
                background: i === index ? "var(--primary)" : "var(--border)",
              }}
            />
          ))}
        </div>
        <Link
          prefetch={false}
          href={`/stock/${cur.code}`}
          className="text-[0.72rem] font-semibold text-[var(--primary)] hover:underline underline-offset-2"
        >
          See full analysis →
        </Link>
      </div>
    </div>
  );
}
