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
    <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="relative h-20 w-20">
        <span className="absolute inset-0 rounded-full border-4 border-[var(--surface-2)]" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[var(--primary)]" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🔍</span>
      </div>
      <p className="mt-5 text-lg font-extrabold text-[var(--text)]">Matching you with stocks…</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Scanning the market against your answers.</p>
      <p lang="bn" className="font-bn mt-1 text-sm text-[var(--text-muted)]">
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
        className="group flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 no-underline transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-[var(--surface-2)]"
      >
        <ScoreBadge score={stock.score} tier={tier} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md border px-1.5 py-0.5 font-mono text-[0.74rem] font-extrabold"
              style={{
                color,
                background: `color-mix(in srgb, ${color} 11%, transparent)`,
                borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
              }}
            >
              {stock.trading_code}
            </span>
            <TierPill tier={tier} />
            <span className="ml-auto shrink-0 text-[0.78rem] font-extrabold tabular-nums nums text-[var(--text)]">
              {stock.ltp == null ? "--" : `৳${stock.ltp.toFixed(2)}`}
            </span>
            {stock.change_pct != null && (
              <span
                className="shrink-0 text-[0.7rem] font-bold tabular-nums nums"
                style={{ color: up ? "var(--positive)" : "var(--negative)" }}
              >
                {up ? "▲" : "▼"}
                {Math.abs(stock.change_pct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[0.78rem] font-semibold text-[var(--text)] underline-offset-2 group-hover:underline">
            {stock.company_name ?? stock.trading_code}
          </div>
          {stock.reasons[0] && (
            <p className="mt-1 text-[0.74rem] leading-snug text-[var(--text-muted)]">{stock.reasons[0]}</p>
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
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-soft)]">
        <p className="text-[0.92rem] font-bold text-[var(--text)]">No clean matches right now.</p>
        <p className="mt-1 text-[0.82rem] text-[var(--text-muted)]">
          Try different answers, or browse the full rankings.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="text-[0.82rem] font-bold text-[var(--primary-ink)] hover:underline"
          >
            Start over
          </button>
          <Link href="/dsestockranking" className="text-[0.82rem] font-bold text-[var(--primary-ink)] hover:underline">
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
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
    >
      <div
        className="border-b px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--positive) 7%, transparent)",
          borderColor: "color-mix(in srgb, var(--positive) 20%, transparent)",
        }}
      >
        <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-[var(--positive)]">
          🎯 Matched to your answers
        </span>
        {/* Styled as a heading but not an <h2> — see HeroMiniQuiz: the page's
            heading outline stays with its real sections. */}
        <p className="mt-1 text-[1.15rem] font-extrabold leading-tight text-[var(--text)]">
          Your {picks.length} stock matches
        </p>
        {summary.length > 0 && (
          <p className="mt-0.5 text-[0.74rem] font-semibold text-[var(--text-muted)]">
            {summary.join(" · ")}
          </p>
        )}
      </div>

      <div className="p-3.5">
        {relax.length > 0 && (
          <p className="mb-2.5 rounded-[var(--radius)] bg-[var(--surface-2)] px-3 py-2 text-[0.74rem] text-[var(--text-muted)]">
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
                  className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <ScoreBadge score={p.score} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[0.74rem] font-extrabold text-[var(--text)]">
                      {p.trading_code}
                    </span>
                    <div className="mt-1 truncate text-[0.78rem] font-semibold text-[var(--text)]">
                      {p.company_name ?? p.trading_code}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[0.72rem] font-extrabold text-[var(--text)] shadow-sm">
                🔒 {locked.length} more {locked.length === 1 ? "match" : "matches"}
              </span>
            </div>
          </div>
        )}

        <div
          className="mt-3 rounded-[var(--radius)] border px-3.5 py-3 text-center"
          style={{
            background: "color-mix(in srgb, var(--primary) 6%, var(--surface))",
            borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)",
          }}
        >
          <p className="text-[0.84rem] font-bold text-[var(--text)]">
            {locked.length > 0
              ? `Unlock all ${picks.length} and save them`
              : "Save these and get fresh picks daily"}
          </p>
          <p lang="bn" className="font-bn mt-0.5 text-[0.76rem] leading-snug text-[var(--text-muted)]">
            ফ্রি অ্যাকাউন্ট খুলুন — প্রতিদিন নতুন মিল পাবেন।
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <Link
              href="/register"
              className="inline-flex min-h-[42px] items-center rounded-lg px-5 text-[0.84rem] font-bold text-white transition hover:brightness-110"
              style={{ background: "var(--primary)" }}
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[42px] items-center rounded-lg border border-[var(--border)] px-4 text-[0.84rem] font-semibold text-[var(--primary-ink)] transition hover:bg-[var(--surface-2)]"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.74rem]">
          <button
            type="button"
            onClick={onRestart}
            className="font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ↺ Start over
          </button>
          <Link
            href="/stock-recommendation"
            className="font-bold text-[var(--primary-ink)] hover:underline underline-offset-2"
          >
            Answer the full quiz →
          </Link>
        </div>

        <p className="mt-2 text-center text-[0.66rem] leading-snug text-[var(--text-muted)]">
          Suggestions based on data, not financial advice. Always do your own research.
        </p>
      </div>
    </m.div>
  );
}
