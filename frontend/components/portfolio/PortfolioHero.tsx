"use client";

import type { ReactNode } from "react";
import { takaGroup } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import type { AnalysisLang, Grade } from "@/lib/portfolio-analysis";

interface Props {
  /** Sum of buy cost across holdings. */
  totalInvested: number;
  /** Market value (null while prices are missing). */
  totalValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  todayMove: { delta: number; pct: number } | null;
  /** DSEX index change % today — kept so older callers compile. */
  dsexPct: number | null;
  holdingsCount: number;
  privacy: boolean;
  onTogglePrivacy: () => void;
  lang?: AnalysisLang;
  /** Kept so older callers compile; the grade lives in "Is everything okay?". */
  grade?: { letter: Grade; title: string; line: string; onOpen: () => void };
  /** An extra portfolio's name ("Mother's BO account is worth"); none = the main one. */
  name?: string;
  /** A small control under the card (the "+ Another portfolio" link). */
  foot?: ReactNode;
}

const signedTaka = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${takaGroup(Math.abs(v))}`;
const signedPct = (v: number, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}%`;
const tone = (v: number | null | undefined) => (v == null || v === 0 ? "flat" : v > 0 ? "up" : "down");

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * The money card: "How much is my money worth?" — ONE card (2026-11-25, the
 * top of the portfolio page redone: the value floated on the canvas with the
 * two answers in a second card under it). Top line: which portfolio + the eye;
 * the value; what was put in across how many shares; then today and since you
 * bought side by side, each a taka figure in its colour with the % as a pill.
 * From 768px the two answers sit on the card's right.
 */
export default function PortfolioHero({
  totalInvested,
  totalValue,
  pnl,
  pnlPct,
  todayMove,
  holdingsCount,
  privacy,
  onTogglePrivacy,
  lang = "en",
  name,
  foot,
}: Props) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const bnCls = bn ? "font-bn" : "";
  const hasValue = totalValue != null;

  const moves: { q: string; a: string | null; pct: string | null; t: string; none: string }[] = [
    {
      q: L("Today", "আজ"),
      a: todayMove ? signedTaka(todayMove.delta) : null,
      pct: todayMove ? signedPct(todayMove.pct, 2) : null,
      t: tone(todayMove?.delta),
      none: L("No prices yet", "এখনো দাম আসেনি"),
    },
    {
      q: L("Since you bought", "কেনার পর থেকে"),
      a: pnl != null ? signedTaka(pnl) : null,
      pct: pnlPct != null ? signedPct(pnlPct) : null,
      t: tone(pnl),
      none: "—",
    },
  ];

  return (
    <section className={`pf-money ${bnCls}`} aria-label={L("Your portfolio value", "আপনার পোর্টফোলিওর মূল্য")}>
      <div className="soft-card pf-money-card">
        <div className="pf-money-main">
          <div className="pf-money-top">
            <p className="pf-money-label">
              {!hasValue
                ? L("You have put in", "আপনি দিয়েছেন")
                : name
                  ? L(`${name} is worth`, `${name}-এর মূল্য`)
                  : L("Your portfolio is worth", "আপনার পোর্টফোলিওর মূল্য")}
            </p>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              iconOnly
              onClick={onTogglePrivacy}
              className="pf-money-eye"
              aria-label={privacy ? L("Show amounts", "টাকা দেখান") : L("Hide amounts", "টাকা লুকান")}
              aria-pressed={privacy}
              title={privacy ? L("Show amounts", "টাকা দেখান") : L("Hide amounts", "টাকা লুকান")}
            >
              <EyeIcon off={privacy} />
            </Button>
          </div>

          <p className="pf-money-value pv">{takaGroup(hasValue ? totalValue : totalInvested)}</p>

          <p className="pf-money-meta">
            {hasValue ? (
              <>
                {L("You put in ", "আপনি দিয়েছেন ")}
                <span className="pf-money-strong pv">{takaGroup(totalInvested)}</span>
                {L(
                  ` · ${holdingsCount} share${holdingsCount === 1 ? "" : "s"}`,
                  ` · ${holdingsCount}টি শেয়ার`,
                )}
              </>
            ) : (
              L("Live prices arrive when the market updates.", "বাজারের দাম এলে এখানে দেখা যাবে।")
            )}
          </p>
        </div>

        <div className="pf-money-moves">
          {moves.map((m) => (
            <div key={m.q} className="pf-money-move">
              <p className="pf-money-q">{m.q}</p>
              {m.a ? (
                <p className={`pf-money-a pf-money-a--${m.t}`}>
                  <span className="pv">{m.a}</span>
                  {m.pct && <span className={`pf-money-pct pf-money-pct--${m.t}`}>{m.pct}</span>}
                </p>
              ) : (
                <p className="pf-money-a pf-money-a--flat">{m.none}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {foot ? <div className="pf-money-foot">{foot}</div> : null}
    </section>
  );
}
