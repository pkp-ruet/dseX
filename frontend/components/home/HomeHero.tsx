"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { type ScoreItem } from "@/lib/api";
import { getTier, TIER_LABELS, type TierKey } from "@/lib/constants";
import SignupCtas from "@/components/home/SignupCtas";

const TIER_VAR: Record<TierKey, string> = {
  strong_buy: "#059669", // vibrant emerald — most impactful
  buy: "#15803D", // deep green — calmer, sits below strong buy
  keep_watching: "var(--watch)",
  avoid: "var(--avoid)",
};

function PreviewRow({ item, rank }: { item: ScoreItem; rank: number }) {
  const tier = getTier(item.score);
  const color = TIER_VAR[tier];
  return (
    <Link
      href={`/stock/${item.trading_code}`}
      className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-l-[3px] hover:bg-[var(--surface-2)] transition-colors"
      style={{ borderLeftColor: `color-mix(in srgb, ${color} 26%, transparent)` }}
    >
      <span className="w-5 text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{rank}</span>
      <span className="font-mono text-[0.82rem] font-bold tracking-[0.02em] shrink-0" style={{ color }}>
        {item.trading_code}
      </span>
      <span className="flex-1 min-w-0 truncate text-xs text-[var(--text-muted)]">
        {item.company_name}
      </span>
      <span
        className="inline-flex items-center justify-center min-w-[2.4rem] px-2 py-1 rounded-lg text-sm font-extrabold tabular-nums text-white"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 78%, #000) 100%)`,
        }}
        title="Fundamental score (0–100)"
      >
        {item.score == null ? "--" : Math.round(item.score)}
      </span>
    </Link>
  );
}

export default function HomeHero({ topItems }: { topItems: ScoreItem[] }) {
  const { isLoggedIn, user } = useAuth();
  const preview = topItems.slice(0, 5);
  const topTier = preview[0] ? getTier(preview[0].score) : "strong_buy";

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
          <span className="inline-flex self-start items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--primary-ink)] shadow-[var(--shadow-soft)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)]" />
            Dhaka Stock Exchange · Fundamental Analysis
          </span>

          <h1 className="font-display mt-5 font-bold tracking-tight text-[var(--text)] leading-[1.06] text-[clamp(2rem,7vw,3.25rem)]">
            Know what every DSE stock is{" "}
            <span className="text-[var(--primary)]">really worth.</span>
          </h1>

          <p className="mt-5 text-[0.98rem] sm:text-base leading-relaxed text-[var(--text-muted)] max-w-prose">
            Free fundamental scores, rankings, watchlists, and portfolio tracking for all
            300+ Dhaka Stock Exchange companies — so you find what&apos;s worth owning in seconds.
          </p>

          <div className="mt-7">
            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Welcome back{user?.display_name ? `, ${user.display_name}` : ""} 👋
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/watchlist"
                    className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[var(--primary)] hover:brightness-110 transition"
                  >
                    My Watchlist
                  </Link>
                  <Link
                    href="/portfolio"
                    className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl font-semibold text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition"
                  >
                    My Portfolio
                  </Link>
                  <Link
                    href="/dsestockranking"
                    className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl font-semibold text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition"
                  >
                    Rankings
                  </Link>
                </div>
              </div>
            ) : (
              <SignupCtas />
            )}
          </div>
        </div>

        {/* Right (below on mobile): live ranking preview */}
        <div className="w-full">
          <div className="soft-card overflow-hidden">
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
          </div>
          <p className="mt-2 text-center text-[0.7rem] text-[var(--text-muted)]">
            Fundamental score · 0–100 scale · updated daily
          </p>
        </div>
      </div>
    </section>
  );
}
