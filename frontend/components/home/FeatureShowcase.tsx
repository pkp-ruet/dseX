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
    "mt-4 inline-flex self-start items-center gap-1.5 min-h-[40px] px-4 rounded-lg font-semibold text-sm text-white bg-[var(--primary)] hover:brightness-110 transition";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10 items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 md:p-6 shadow-sm transition hover:shadow-md hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
      <div className={`order-2 w-full md:max-w-[380px] mx-auto ${odd ? "md:order-2 md:ml-auto" : "md:order-1 md:mr-auto"}`}>
        {pillar.visual}
      </div>

      <div className={`order-1 flex flex-col ${odd ? "md:order-1" : "md:order-2"}`}>
        <EyebrowBadge label={pillar.eyebrow} />
        <h3 className="font-display mt-2 text-[1.45rem] sm:text-2xl font-extrabold tracking-tight text-[var(--text)] leading-[1.15]">
          {pillar.title}
        </h3>
        <p className="mt-1.5 text-sm leading-snug text-[var(--text-muted)]">{pillar.desc}</p>

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
      title: "Not sure what to buy?",
      desc: "60-second quiz → 3 matched DSE stocks.",
      anon: { label: "Find my stocks", href: "/stock-recommendation" },
      auth: { label: "Find my stocks", href: "/stock-recommendation" },
      visual: <RecommendationMockup />,
    },
    {
      eyebrow: "Stock Analysis",
      title: "Every stock, scored 0–100",
      desc: "Plain-English verdict on any DSE stock.",
      anon: { label: "Search any stock", href: "/stocks" },
      auth: { label: "Search any stock", href: "/stocks" },
      search: true,
      visual: sampleDetail ? <SampleAnalysisCard detail={sampleDetail} /> : <RankingFallback />,
    },
    {
      eyebrow: "Rankings",
      title: "Best DSE stocks, ranked",
      desc: "Top fundamentals first. Updated daily.",
      anon: { label: "Browse rankings", href: "/dsestockranking" },
      auth: { label: "Browse rankings", href: "/dsestockranking" },
      visual: <LiveRankingPreview items={rankingItems.slice(0, 3)} totalCount={totalCount} />,
    },
    {
      eyebrow: "Watchlist",
      title: "Track what you care about",
      desc: "Save stocks + news, synced free.",
      anon: { label: "Sign up to save stocks", href: "/register" },
      auth: { label: "Open your watchlist", href: "/watchlist" },
      visual: <WatchlistMockup />,
    },
    {
      eyebrow: "Portfolio Analysis",
      title: "Get your portfolio graded",
      desc: "A–F grade + live P/L + what to fix.",
      anon: { label: "Sign up to track holdings", href: "/register" },
      auth: { label: "Open your portfolio", href: "/portfolio" },
      visual: <PortfolioMockup />,
    },
  ];

  if (hasTips) {
    pillars.push({
      eyebrow: "Daily Tips",
      title: "Fresh stock ideas, daily",
      desc: "10 hand-picked tips, every day.",
      anon: { label: "Sign up for daily tips", href: "/register" },
      auth: { label: "See today's tips", href: "/" },
      visual: <DailyTipsCard tips={tips.slice(0, 3)} />,
    });
  }

  return (
    <section className="flex flex-col gap-5 sm:gap-7 py-2">
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
