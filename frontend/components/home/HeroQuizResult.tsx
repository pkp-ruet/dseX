"use client";

import Link from "next/link";
import { m } from "motion/react";
import { type RecommendedStock } from "@/lib/api";
import { getTier, TIER_VAR } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";

/** How many matches a logged-out visitor sees before the signup gate. */
const FREE_PICKS = 2;

const RELAX_LABEL: Record<string, string> = {
  budget: "price range",
  dividend: "dividend preference",
  sector: "sector choice",
  risk: "risk comfort",
};

/** Shown in the hero's right column while the match is being computed. */
export function HeroQuizLoading() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 text-center shadow-soft">
      <div className="relative h-20 w-20">
        <span className="absolute inset-0 rounded-full border-4 border-surface-2" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🔍</span>
      </div>
      <p className="mt-5 text-lg font-extrabold text-text-main">Matching you with stocks…</p>
      <p className="mt-1 text-sm text-text-muted">Scanning the market against your answers.</p>
      <p lang="bn" className="font-bn mt-1 text-sm text-text-muted">
        আপনার উত্তর মিলিয়ে দেখছি।
      </p>
    </div>
  );
}

function PickRow({ stock, rank }: { stock: RecommendedStock; rank: number }) {
  const tier = getTier(stock.score);
  const color = TIER_VAR[tier];
  const up = (stock.change_pct ?? 0) >= 0;

  return (
    <m.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/stock/${stock.trading_code}`}
        prefetch={false}
        className="group flex gap-3 rounded border border-border bg-surface p-3 no-underline transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-surface-2"
      >
        <ScoreBadge score={stock.score} tier={tier} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md border px-1.5 py-0.5 font-mono text-xs font-extrabold"
              style={{
                color,
                background: `color-mix(in srgb, ${color} 11%, transparent)`,
                borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
              }}
            >
              {stock.trading_code}
            </span>
            <TierPill tier={tier} />
            <span className="ml-auto shrink-0 text-xs font-extrabold tabular-nums nums text-text-main">
              {stock.ltp == null ? "--" : `৳${stock.ltp.toFixed(2)}`}
            </span>
            {stock.change_pct != null && (
              <span
                className="shrink-0 text-xs font-bold tabular-nums nums"
                style={{ color: up ? "var(--positive)" : "var(--negative)" }}
              >
                {up ? "▲" : "▼"}
                {Math.abs(stock.change_pct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-text-main underline-offset-2 group-hover:underline">
            {stock.company_name ?? stock.trading_code}
          </div>
          {stock.reasons[0] && (
            <p className="mt-1 text-xs leading-snug text-text-muted">{stock.reasons[0]}</p>
          )}
        </div>
      </Link>
    </m.li>
  );
}

interface Props {
  picks: RecommendedStock[];
  /** The labels the visitor tapped, e.g. ["Steady cash", "Under a year"]. */
  summary: string[];
  relaxations: string[];
  onRestart: () => void;
}

/**
 * The payoff panel — replaces the hero's self-playing demo card the moment the
 * mini-quiz finishes. Two real matches are shown in full; the rest sit behind a
 * free account, so the signup ask arrives after the value instead of before it.
 */
export default function HeroQuizResult({ picks, summary, relaxations, onRestart }: Props) {
  const shown = picks.slice(0, FREE_PICKS);
  const locked = picks.slice(FREE_PICKS);
  const relax = relaxations.filter((r) => RELAX_LABEL[r]);

  if (picks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-soft">
        <p className="text-base font-bold text-text-main">No clean matches right now.</p>
        <p className="mt-1 text-sm text-text-muted">
          Try different answers, or browse the full rankings.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="text-sm font-bold text-primary-ink hover:underline"
          >
            Start over
          </button>
          <Link href="/dsestockranking" className="text-sm font-bold text-primary-ink hover:underline">
            See rankings →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      role="region"
      aria-label="Your stock matches"
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft"
    >
      <div
        className="border-b px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--positive) 7%, transparent)",
          borderColor: "color-mix(in srgb, var(--positive) 20%, transparent)",
        }}
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.13em] text-positive">
          🎯 Matched to your answers
        </span>
        {/* Styled as a heading but not an <h2> — see HeroMiniQuiz: the page's
            heading outline stays with its real sections. */}
        <p className="mt-1 text-lg font-extrabold leading-tight text-text-main">
          Your {picks.length} stock matches
        </p>
        {summary.length > 0 && (
          <p className="mt-0.5 text-xs font-semibold text-text-muted">
            {summary.join(" · ")}
          </p>
        )}
      </div>

      <div className="p-3.5">
        {relax.length > 0 && (
          <p className="mb-2.5 rounded bg-surface-2 px-3 py-2 text-xs text-text-muted">
            We widened your {relax.map((r) => RELAX_LABEL[r]).join(" and ")} to find good matches.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {shown.map((p, i) => (
            <PickRow key={p.trading_code} stock={p} rank={i} />
          ))}
        </ul>

        {locked.length > 0 && (
          <div className="relative mt-2">
            {/* Real codes, deliberately unreadable — proof the matches exist. */}
            <ul aria-hidden className="flex select-none flex-col gap-2 blur-[5px]">
              {locked.slice(0, 2).map((p) => (
                <li
                  key={p.trading_code}
                  className="flex items-center gap-3 rounded border border-border bg-surface p-3"
                >
                  <ScoreBadge score={p.score} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs font-extrabold text-text-main">
                      {p.trading_code}
                    </span>
                    <div className="mt-1 truncate text-xs font-semibold text-text-main">
                      {p.company_name ?? p.trading_code}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]">
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-extrabold text-text-main shadow-sm">
                🔒 {locked.length} more {locked.length === 1 ? "match" : "matches"}
              </span>
            </div>
          </div>
        )}

        <div
          className="mt-3 rounded border px-3.5 py-3 text-center"
          style={{
            background: "color-mix(in srgb, var(--primary) 6%, var(--surface))",
            borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)",
          }}
        >
          <p className="text-sm font-bold text-text-main">
            {locked.length > 0
              ? `Unlock all ${picks.length} and save them`
              : "Save these and get fresh picks daily"}
          </p>
          <p lang="bn" className="font-bn mt-0.5 text-xs leading-snug text-text-muted">
            ফ্রি অ্যাকাউন্ট খুলুন — প্রতিদিন নতুন মিল পাবেন।
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <Link
              href="/register"
              className="btn-primary"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="btn-quiet"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={onRestart}
            className="font-semibold text-text-muted hover:text-text-main"
          >
            ↺ Start over
          </button>
          <Link
            href="/stock-recommendation"
            className="font-bold text-primary-ink hover:underline underline-offset-2"
          >
            Answer the full quiz →
          </Link>
        </div>

        <p className="mt-2 text-center text-xs leading-snug text-text-muted">
          Suggestions based on data, not financial advice. Always do your own research.
        </p>
      </div>
    </m.div>
  );
}
