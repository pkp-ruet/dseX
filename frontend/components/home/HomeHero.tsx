"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { type ScoreItem } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_VAR } from "@/lib/constants";
import SignupCtas from "@/components/home/SignupCtas";
import SearchBar from "@/components/home/SearchBar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/** Animate a score from 0 up to its target on mount; instant if reduced-motion. */
function useCountUp(target: number | null, delayMs: number): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const dur = 700;
    const timer = setTimeout(() => {
      const step = (ts: number) => {
        if (start == null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        setVal(Math.round(target * p));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delayMs]);
  return val;
}

function PreviewRow({ item, rank }: { item: ScoreItem; rank: number }) {
  const tier = getTier(item.score);
  const color = TIER_VAR[tier];
  const count = useCountUp(item.score, 200 + (rank - 1) * 120);
  return (
    <Link
      prefetch={false} href={`/stock/${item.trading_code}`}
      className="hero-row-in flex items-center gap-3 px-3 sm:px-4 py-2.5 border-l-[3px] hover:bg-[var(--surface-2)] transition-colors"
      style={{
        borderLeftColor: `color-mix(in srgb, ${color} 26%, transparent)`,
        animationDelay: `${(rank - 1) * 100}ms`,
      }}
    >
      <span className="w-5 text-right text-xs font-bold tabular-nums nums text-[var(--text-muted)]">{rank}</span>
      <span className="font-mono text-[0.82rem] font-bold tracking-[0.02em] shrink-0" style={{ color }}>
        {item.trading_code}
      </span>
      <span className="flex-1 min-w-0 truncate text-xs text-[var(--text-muted)]">
        {item.company_name}
      </span>
      <span
        className="inline-flex items-center justify-center min-w-[2.4rem] px-2 py-1 rounded-lg text-sm font-extrabold tabular-nums nums text-white"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 78%, #000) 100%)`,
        }}
        title="Fundamental score (0–100)"
      >
        {item.score == null ? "--" : count}
      </span>
    </Link>
  );
}

export default function HomeHero({ topItems }: { topItems: ScoreItem[] }) {
  const { isLoggedIn, user } = useAuth();
  const preview = topItems.slice(0, 5);
  const topTier = preview[0] ? getTier(preview[0].score) : "strong_buy";
  const companies = topItems.map((s) => ({
    trading_code: s.trading_code,
    company_name: s.company_name,
  }));
  const statCount = Math.max(50, Math.floor(topItems.length / 50) * 50);

  return (
    <section className="relative pt-8 sm:pt-14 pb-2">
      {/* Soft ambient glow behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[460px]"
        style={{ background: "var(--ambient)" }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
        {/* Left: pitch + CTA */}
        <div className="flex flex-col">
          {!isLoggedIn && (
            <span
              className="inline-flex self-start items-center gap-2.5 rounded-full px-4 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] shadow-sm"
              style={{
                background:
                  "linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(100deg, var(--primary), var(--positive)) border-box",
                border: "1.5px solid transparent",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--positive)] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--positive)]" />
              </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--positive))" }}
              >
                Know before you buy
              </span>
            </span>
          )}

          <h1 className="font-display mt-5 font-bold tracking-tight text-[var(--text)] leading-[1.06] text-[clamp(2rem,7vw,3.25rem)]">
            Make smarter{" "}
            <span className="text-[var(--primary)]">DSE decisions.</span>
          </h1>

          <p lang="bn" className="font-bn mt-3 text-[1.25rem] sm:text-[1.4rem] font-semibold text-[var(--text)]">
            কোন শেয়ার ভালো, কোনটা নয় — <span className="text-[var(--positive)]">এক নজরে বুঝে নিন।</span>
          </p>

          {isLoggedIn ? (
            <div className="mt-7 flex flex-col gap-3">
              <p className="text-sm text-[var(--text-muted)]">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ""} 👋
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button href="/watchlist" variant="primary">
                  My Watchlist
                </Button>
                <Button href="/portfolio" variant="ghost">
                  My Portfolio
                </Button>
                <Button href="/dsestockranking" variant="ghost">
                  Rankings
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Try-it search — explore instantly, before any signup */}
              <div className="mt-6">
                <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--primary-ink)]">
                  See any stock&apos;s score — free
                </p>
                <SearchBar companies={companies} variant="sidebar" />
              </div>

              <div className="mt-5">
                <SignupCtas />
              </div>

              {/* Trust / scale proof */}
              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-[var(--text-muted)]">
                <span>
                  <span className="font-bold text-[var(--text)]">{statCount}+</span> companies scored
                </span>
                <span className="opacity-50">·</span>
                <span>Updated every trading day</span>
                <span className="opacity-50">·</span>
                <span>100% free</span>
              </div>
            </>
          )}
        </div>

        {/* Right (below on mobile): live ranking preview */}
        <div className="w-full">
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--positive)] animate-pulse" />
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
                  Top Ranked Stocks
                </span>
              </div>
              <span
                className="text-[0.62rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                style={{ background: TIER_VAR[topTier] }}
              >
                {TIER_LABELS[topTier]}
              </span>
            </div>
            <div className="flex items-center justify-end px-4 pt-2 pb-1">
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Fundamental score
              </span>
            </div>
            <div className="divide-y divide-[var(--cell-rule)]">
              {preview.map((item, i) => (
                <PreviewRow key={item.trading_code} item={item} rank={i + 1} />
              ))}
            </div>
            <Link
              href="/dsestockranking"
              className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
            >
              View full rankings →
            </Link>
          </Card>
          <p className="mt-2 text-center text-[0.7rem] text-[var(--text-muted)]">
            Fundamental score · 0–100 scale · updated daily
          </p>
        </div>
      </div>
    </section>
  );
}
