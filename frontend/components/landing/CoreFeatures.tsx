import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";
import PortfolioMockup from "@/components/home/PortfolioMockup";
import WatchlistMockup from "@/components/home/WatchlistMockup";
import PriceAlertMockup from "@/components/home/PriceAlertMockup";
import type { ScoreItem } from "@/lib/api";

/**
 * Block 3 — the four things people actually come here for.
 *
 * Sits high on purpose: rankings, portfolio, watchlist and alerts are the
 * product, and burying them below sections of prose was the main problem with
 * the first cut of this page. Each card gets its own accent colour and icon tile
 * so the block reads as four distinct tools at a glance, an English title, one
 * English line, one Bengali line, and a visual — no paragraphs.
 *
 * The rankings card renders live data from /api/scores. The other three visuals
 * are the illustrative mockups from components/home/* — nothing on the page
 * currently labels them as examples (the note that used to say so was cut).
 */

interface Feature {
  href: string;
  title: string;
  line: string;
  bn: string;
  cta: string;
  accent: string;
  icon: ReactNode;
  /** Shown as a small tag when the feature needs an account. */
  needsAccount: boolean;
  visual: ReactNode;
}

export default function CoreFeatures({
  items,
  totalCount,
}: {
  items: ScoreItem[];
  totalCount: number;
}) {
  const FEATURES: Feature[] = [
    {
      href: "/dsestockranking",
      title: "Rankings",
      line: "Every company in order of score — strongest at the top, weakest at the bottom.",
      bn: "সব কোম্পানি স্কোর অনুযায়ী সাজানো — সবচেয়ে মজবুত থেকে সবচেয়ে দুর্বল।",
      cta: "See the rankings",
      accent: "var(--info)",
      icon: (
        <>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </>
      ),
      needsAccount: false,
      visual: <LiveRankingPreview items={items} totalCount={totalCount} />,
    },
    {
      href: "/portfolio",
      title: "Portfolio",
      line: "Add what you bought and see your profit or loss, plus a simple grade, every day.",
      bn: "কী কিনেছেন লিখে রাখুন — প্রতিদিন লাভ-ক্ষতি আর একটা সহজ গ্রেড দেখুন।",
      cta: "Open portfolio",
      accent: "var(--positive)",
      icon: (
        <>
          <path d="M3 17l5-5 4 3 5-7 4 4" />
          <path d="M3 21h18" />
        </>
      ),
      needsAccount: true,
      visual: <PortfolioMockup />,
    },
    {
      href: "/watchlist",
      title: "Watchlist",
      line: "Save the stocks you are watching and read all their news in one place.",
      bn: "নজরে রাখা শেয়ার আর তার সব খবর এক জায়গায়, সব ডিভাইসে।",
      cta: "Open watchlist",
      accent: "var(--warm)",
      icon: (
        <>
          <path d="M12 3.5l2.7 5.5 6 .9-4.35 4.24 1.03 6L12 17.3 6.62 20.14l1.03-6L3.3 9.9l6-.9z" />
        </>
      ),
      needsAccount: true,
      visual: <WatchlistMockup />,
    },
    {
      href: "/alerts",
      title: "Price alerts",
      line: "Pick a price and we will tell you the day the stock reaches it.",
      bn: "একটা দাম ঠিক করে দিন — সেই দামে পৌঁছালেই জানিয়ে দেব।",
      cta: "Set an alert",
      accent: "var(--primary)",
      icon: (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
      ),
      needsAccount: true,
      visual: <PriceAlertMockup />,
    },
  ];

  return (
    <section aria-labelledby="features-title">
      <SectionHead
        eyebrow="What you can do here"
        id="features-title"
        title="Four tools."
        highlight="All free."
        accent="var(--primary)"
        icon={<><path d="M4 5h16M4 12h16M4 19h10" /></>}
        bn="চারটে কাজ — সবই ফ্রি। র‍্যাঙ্কিং দেখতে অ্যাকাউন্টও লাগে না।"
      />

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {FEATURES.map((f) => (
          <div
            key={f.href}
            className="acc-card acc-top flex flex-col p-5"
            style={{ "--acc": f.accent } as CSSProperties}
          >
            <div className="flex items-start gap-3.5">
              <span className="icon-tile" aria-hidden>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon}
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h3 className="text-[1.1rem] font-bold text-[var(--text)]">{f.title}</h3>
                  {f.needsAccount ? (
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Free account
                    </span>
                  ) : (
                    <span
                      className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em]"
                      style={{
                        color: "var(--positive)",
                        background: "color-mix(in srgb, var(--positive) 12%, transparent)",
                      }}
                    >
                      No login needed
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
                  {f.line}
                </p>
                <Bn className="mt-1 text-[0.85rem] leading-relaxed text-[var(--text)]">{f.bn}</Bn>
              </div>
            </div>

            <div className="mt-4">{f.visual}</div>

            <Link
              href={f.href}
              className="mt-4 inline-flex items-center gap-1.5 text-[0.85rem] font-bold underline-offset-4 hover:underline"
              style={{ color: f.accent }}
            >
              {f.cta}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        ))}
      </div>

    </section>
  );
}
