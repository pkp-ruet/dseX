"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import { type ScoreItem, type CompanyDetail, type DailyTip } from "@/lib/api";
import SampleAnalysisCard from "@/components/home/SampleAnalysisCard";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";
import WatchlistMockup from "@/components/home/WatchlistMockup";
import PortfolioMockup from "@/components/home/PortfolioMockup";
import DailyTipsCard from "@/components/home/DailyTipsCard";
import RecommendationMockup from "@/components/home/RecommendationMockup";

interface Pillar {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  anon: { label: string; href: string };
  auth: { label: string; href: string };
  /** When true, the CTA opens the global stock search instead of navigating. */
  search?: boolean;
  visual: ReactNode;
}

// Per-pillar eyebrow badge — distinct color, icon and shape for each feature.
const EYEBROW: Record<
  string,
  { color: string; kind: "solid" | "tab" | "outline" | "glass" | "soft"; icon: ReactNode }
> = {
  "Stock Recommendation": {
    color: "var(--np-cautious)",
    kind: "solid",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  "Stock Analysis": {
    color: "var(--primary)",
    kind: "solid",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  Rankings: {
    color: "var(--watch)",
    kind: "tab",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 21V10M12 21V4M19 21v-7" />
      </svg>
    ),
  },
  Watchlist: {
    color: "var(--positive)",
    kind: "outline",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6L12 2z" />
      </svg>
    ),
  },
  "Portfolio Analysis": {
    color: "var(--np-cautious)",
    kind: "glass",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12A9 9 0 1 1 12 3v9z" /><path d="M12 3a9 9 0 0 1 9 9h-9z" />
      </svg>
    ),
  },
  "Daily Tips": {
    color: "var(--negative)",
    kind: "soft",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
};

function EyebrowBadge({ label }: { label: string }) {
  const cfg = EYEBROW[label] ?? { color: "var(--primary)", kind: "soft" as const, icon: null };
  const c = cfg.color;

  if (cfg.kind === "solid") {
    return (
      <span
        className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-sm"
        style={{ background: `linear-gradient(90deg, ${c}, color-mix(in srgb, ${c} 60%, #fff))` }}
      >
        {cfg.icon}
        {label}
      </span>
    );
  }

  if (cfg.kind === "tab") {
    return (
      <span
        className="inline-flex self-start items-center gap-1.5 pl-2.5 pr-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em]"
        style={{ color: c, borderLeft: `3px solid ${c}`, background: `color-mix(in srgb, ${c} 8%, transparent)` }}
      >
        {cfg.icon}
        {label}
      </span>
    );
  }

  if (cfg.kind === "outline") {
    return (
      <span
        className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-[0.14em]"
        style={{ color: c, border: `1.5px solid color-mix(in srgb, ${c} 45%, transparent)` }}
      >
        {cfg.icon}
        {label}
      </span>
    );
  }

  if (cfg.kind === "glass") {
    return (
      <span
        className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-[0.14em] shadow-sm"
        style={{
          color: c,
          background: `linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(90deg, ${c}, color-mix(in srgb, ${c} 40%, #fff)) border-box`,
          border: "1.5px solid transparent",
        }}
      >
        {cfg.icon}
        {label}
      </span>
    );
  }

  // soft
  return (
    <span
      className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-[0.14em]"
      style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
    >
      {cfg.icon}
      {label}
    </span>
  );
}

function FeatureRow({ pillar, index }: { pillar: Pillar; index: number }) {
  const { isLoggedIn } = useAuth();
  const cta = isLoggedIn ? pillar.auth : pillar.anon;
  const odd = index % 2 === 1;
  const ctaClass =
    "mt-6 inline-flex self-start items-center gap-1.5 min-h-[44px] px-5 rounded-xl font-semibold text-sm text-white bg-[var(--primary)] hover:brightness-110 transition";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 md:p-9 shadow-sm transition hover:shadow-md hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
      <div className={odd ? "md:order-2" : "md:order-1"}>{pillar.visual}</div>

      <div className={`flex flex-col ${odd ? "md:order-1" : "md:order-2"}`}>
        <EyebrowBadge label={pillar.eyebrow} />
        <h3 className="font-display mt-2 text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[var(--text)] leading-tight">
          {pillar.title}
        </h3>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--text-muted)]">{pillar.desc}</p>

        <ul className="mt-4 flex flex-col gap-2">
          {pillar.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
              <svg className="mt-0.5 shrink-0 text-[var(--positive)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {pillar.search ? (
          <button type="button" onClick={openGlobalSearch} className={ctaClass}>
            {cta.label} →
          </button>
        ) : (
          <Link href={cta.href} className={ctaClass}>
            {cta.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function FeatureShowcase({
  sampleDetail,
  rankingItems,
  totalCount,
  tips = [],
}: {
  sampleDetail: CompanyDetail | null;
  rankingItems: ScoreItem[];
  totalCount: number;
  tips?: DailyTip[];
}) {
  const hasTips = tips.length > 0;
  const pillars: Pillar[] = [
    {
      eyebrow: "Stock Recommendation",
      title: "Not sure what to buy? Answer 6 questions.",
      desc: "Tell us how long you want to hold, what style you like, your sector and budget — and we hand you 3 DSE stocks that fit, each with a plain-English reason why. No charts to read, no jargon.",
      bullets: [
        "A 60-second quiz — holding time, dividends, value & budget",
        "3 matched stocks, each with a clear reason it fits you",
        "Save your picks and revisit them any time",
      ],
      anon: { label: "Find my stocks", href: "/stock-recommendation" },
      auth: { label: "Find my stocks", href: "/stock-recommendation" },
      visual: <RecommendationMockup />,
    },
    {
      eyebrow: "Stock Analysis",
      title: "Every stock, scored on fundamentals",
      desc: "Search any DSE stock and get one plain-English 0–100 score and verdict — built from its earnings, financial health, competitive strength, valuation and dividends, backed by real price and key numbers. No jargon, no guesswork.",
      bullets: [
        "Search any of 300+ listed companies",
        "Plain-English verdict, not just a number",
        "Price, EPS, P/E, dividends, signals & news in one place",
      ],
      anon: { label: "Search any stock", href: "/stocks" },
      auth: { label: "Search any stock", href: "/stocks" },
      search: true,
      visual: sampleDetail ? <SampleAnalysisCard detail={sampleDetail} /> : <RankingFallback />,
    },
    {
      eyebrow: "Rankings",
      title: "See the best-scored stocks instantly",
      desc: "Skip the noise. Our leaderboard ranks all DSE companies by fundamental score, updated daily — so the strongest names rise to the top.",
      bullets: [
        "Full leaderboard of 300+ scored companies",
        "Filter by sector, tier and category",
        "Updated every day after market close",
      ],
      anon: { label: "Browse rankings", href: "/dsestockranking" },
      auth: { label: "Browse rankings", href: "/dsestockranking" },
      visual: <LiveRankingPreview items={rankingItems.slice(0, 3)} totalCount={totalCount} />,
    },
    {
      eyebrow: "Watchlist",
      title: "Track the stocks you care about",
      desc: "Star any stock to build a personal watchlist that syncs across all your devices — and get the latest company news for everything you follow, in one feed.",
      bullets: [
        "One-tap save, synced to your account",
        "News & dividend alerts for your stocks",
        "Free forever — no credit card",
      ],
      anon: { label: "Sign up to save stocks", href: "/register" },
      auth: { label: "Open your watchlist", href: "/watchlist" },
      visual: <WatchlistMockup />,
    },
    {
      eyebrow: "Portfolio Analysis",
      title: "Get your portfolio graded, not just tracked",
      desc: "Add your holdings and we grade the whole portfolio A–F — scoring how well your money is spread, how strong your companies are, and whether you bought at fair prices — then tell you exactly what to fix.",
      bullets: [
        "A–F grade with spread, quality & entry sub-scores",
        "What's working vs. what needs your attention",
        "Live P/L plus the fundamental health of every holding",
      ],
      anon: { label: "Sign up to track holdings", href: "/register" },
      auth: { label: "Open your portfolio", href: "/portfolio" },
      visual: <PortfolioMockup />,
    },
  ];

  if (hasTips) {
    pillars.push({
      eyebrow: "Daily Tips",
      title: "Fresh stock ideas, every single day",
      desc: "Wake up to a hand-picked list of fundamental tips — which companies grew profit, who pays the fattest sustainable dividend, what's trading cheap. Refreshed daily after market close so you always know where to look.",
      bullets: [
        "10 plain-English tips, rebuilt every day",
        "Profit growth, dividends, value & quality signals",
        "Only solid, non-risky stocks make the cut",
      ],
      anon: { label: "Sign up for daily tips", href: "/register" },
      auth: { label: "See today's tips", href: "/" },
      visual: <DailyTipsCard tips={tips.slice(0, 3)} />,
    });
  }

  return (
    <section className="flex flex-col gap-10 sm:gap-14 py-4">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-8 sm:w-14" style={{ background: "linear-gradient(90deg, transparent, var(--primary))" }} />
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-[0.2em] text-white shadow-md"
            style={{
              background: "linear-gradient(100deg, var(--primary), var(--np-cautious))",
              boxShadow: "0 6px 20px -6px color-mix(in srgb, var(--primary) 60%, transparent)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6L12 2z" />
            </svg>
            Why TopStockBD
          </span>
          <span className="h-px w-8 sm:w-14" style={{ background: "linear-gradient(90deg, var(--np-cautious), transparent)" }} />
        </div>

        <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-extrabold tracking-tight text-[var(--text)] leading-[1.05] max-w-3xl">
          One free account.
          <br className="hidden sm:block" />{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--np-cautious) 70%, var(--positive))" }}
          >
            Every DSE tool
          </span>{" "}
          you need.
        </h2>

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {[
            ["Recommendations", "var(--np-cautious)"],
            ["Analysis", "var(--primary)"],
            ["Rankings", "var(--watch)"],
            ["Watchlist", "var(--positive)"],
            ["Portfolio", "var(--np-cautious)"],
            ...(hasTips ? [["Daily Tips", "var(--negative)"] as const] : []),
          ].map(([word, color]) => (
            <span
              key={word as string}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold"
              style={{
                color: color as string,
                background: `color-mix(in srgb, ${color as string} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color as string} 28%, transparent)`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color as string }} />
              {word}
            </span>
          ))}
        </div>
      </div>

      {pillars.map((p, i) => (
        <FeatureRow key={p.eyebrow} pillar={p} index={i} />
      ))}
    </section>
  );
}

function RankingFallback() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
      Live analysis is loading — check back in a moment.
    </div>
  );
}
