"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

interface Stat {
  /** Numeric value to count up to, or null for a fixed text stat. */
  target: number | null;
  /** Rendered text when `target` is null (e.g. "5", "Daily"). */
  text?: string;
  suffix?: string;
  label: string;
}

function useCountUp(target: number, run: boolean): number {
  const reduced = useReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced) {
      setVal(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const dur = 900;
    const step = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target, reduced]);
  return val;
}

function StatValue({ stat, run }: { stat: Stat; run: boolean }) {
  const counted = useCountUp(stat.target ?? 0, run);
  if (stat.target == null) return <>{stat.text}</>;
  return (
    <>
      {counted}
      {stat.suffix}
    </>
  );
}

/**
 * Proof band — animates its numbers up when scrolled into view. The labels are
 * always in the DOM (SEO); only the numerals ramp (not keyword-critical), and
 * they snap to final under reduced motion.
 */
export default function StatsCountUp({
  totalCount,
  sectorCount,
}: {
  totalCount: number;
  sectorCount: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const stats: Stat[] = [
    { target: totalCount, suffix: "+", label: "Stocks scored" },
    { target: null, text: "5", label: "Fundamental pillars" },
    sectorCount > 0
      ? { target: sectorCount, label: "DSE sectors covered" }
      : { target: null, text: "All", label: "DSE sectors covered" },
    { target: null, text: "Daily", label: "Data updates" },
  ];

  return (
    <section ref={ref} className="soft-card px-5 sm:px-7 py-7 sm:py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular-nums nums text-[var(--primary)] leading-none">
              <StatValue stat={s} run={inView} />
            </div>
            <div className="mt-1.5 text-[0.7rem] sm:text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
