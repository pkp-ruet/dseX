"use client";

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
  /** DSEX index change % today — the "you vs the market" answer. */
  dsexPct: number | null;
  holdingsCount: number;
  privacy: boolean;
  onTogglePrivacy: () => void;
  lang?: AnalysisLang;
  /** The one line to the grade (the full card lives in chapter 3). */
  grade?: { letter: Grade; title: string; line: string; onOpen: () => void };
}

const signedTaka = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${takaGroup(Math.abs(v))}`;
const signedPct = (v: number, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}%`;
const tone = (v: number | null | undefined) => (v == null || v === 0 ? "pf-flat" : v > 0 ? "pf-up" : "pf-down");

/**
 * The money hero (2026-10-26 redesign, the market-analysis hero shape): open
 * on the canvas — what the portfolio is worth and what it has made — then
 * ONE card with four answers in a hairline grid (today · since you bought ·
 * you vs the market · what you put in) and the grade line as its footer.
 * No pills, no donut: the money is the picture.
 */
export default function PortfolioHero({
  totalInvested,
  totalValue,
  pnl,
  pnlPct,
  todayMove,
  dsexPct,
  holdingsCount,
  privacy,
  onTogglePrivacy,
  lang = "en",
  grade,
}: Props) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const bnCls = bn ? "font-bn" : "";
  const hasValue = totalValue != null;

  // You vs the market today: a hair's width either way counts as level.
  const diff = todayMove != null && dsexPct != null ? todayMove.pct - dsexPct : null;
  const vs =
    diff == null
      ? null
      : Math.abs(diff) < 0.05
        ? { word: L("Level with it", "বাজারের সমান"), cls: "pf-flat" }
        : diff > 0
          ? { word: L("Ahead of it", "বাজারের চেয়ে ভালো"), cls: "pf-up" }
          : { word: L("Behind it", "বাজারের চেয়ে পিছিয়ে"), cls: "pf-down" };

  const answers: { q: string; a: React.ReactNode; x: React.ReactNode; cls?: string }[] = [
    {
      q: L("Today", "আজ"),
      a: todayMove ? <span className="pv">{signedTaka(todayMove.delta)}</span> : "—",
      x: todayMove ? signedPct(todayMove.pct, 2) : L("No prices yet", "এখনো দাম আসেনি"),
      cls: tone(todayMove?.delta),
    },
    {
      q: L("Since you bought", "কেনার পর থেকে"),
      a: pnl != null ? <span className="pv">{signedTaka(pnl)}</span> : "—",
      x: pnlPct != null ? signedPct(pnlPct) : "",
      cls: tone(pnl),
    },
    {
      q: L("You vs the market today", "আজ বাজারের তুলনায়"),
      a: vs ? vs.word : "—",
      x: dsexPct != null ? `DSEX ${signedPct(dsexPct, 2)}` : "",
      cls: vs?.cls,
    },
    {
      q: L("What you put in", "আপনি দিয়েছেন"),
      a: <span className="pv">{takaGroup(totalInvested)}</span>,
      x: L(`${holdingsCount} stock${holdingsCount === 1 ? "" : "s"}`, `${holdingsCount}টি শেয়ার`),
    },
  ];

  return (
    <section className="pf-hero" aria-label={L("Your portfolio value", "আপনার পোর্টফোলিওর মূল্য")}>
      <p className={`pf-hero-label ${bnCls}`}>
        {hasValue ? L("Your portfolio is worth", "আপনার পোর্টফোলিওর মূল্য") : L("You have put in", "আপনি দিয়েছেন")}
        <Button
          type="button"
          variant="link"
          size="sm"
          iconOnly
          onClick={onTogglePrivacy}
          className="-my-2"
          aria-label={privacy ? L("Show amounts", "টাকা দেখান") : L("Hide amounts", "টাকা লুকান")}
          aria-pressed={privacy}
          title={privacy ? L("Show amounts", "টাকা দেখান") : L("Hide amounts", "টাকা লুকান")}
        >
          {privacy ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </Button>
      </p>

      <p className="pf-hero-value pv">{takaGroup(hasValue ? totalValue : totalInvested)}</p>

      <p className={`pf-hero-change ${bnCls}`}>
        {pnl != null ? (
          <>
            <b className={`pv ${tone(pnl)}`}>
              {signedTaka(pnl)}
              {pnlPct != null ? ` (${signedPct(pnlPct)})` : ""}
            </b>{" "}
            {pnl >= 0 ? L("profit since you bought", "কেনার পর থেকে লাভ") : L("loss since you bought", "কেনার পর থেকে লোকসান")}
          </>
        ) : (
          L("Live prices arrive when the market updates.", "বাজারের দাম এলে এখানে দেখা যাবে।")
        )}
      </p>

      <div className="soft-card pf-answers">
        <div className="pf-answer-grid">
          {answers.map((a) => (
            <div key={a.q} className={`pf-answer ${bnCls}`}>
              <p className="pf-answer-q">{a.q}</p>
              <p className={`pf-answer-a ${a.cls ?? ""}`}>{a.a}</p>
              {a.x ? <p className="pf-answer-x">{a.x}</p> : null}
            </div>
          ))}
        </div>
        {grade && (
          <button type="button" className={`pf-grade-row ${bnCls}`} onClick={grade.onOpen}>
            <span className={`pf-grade-letter pf-g-${grade.letter}`} aria-hidden>
              {grade.letter}
            </span>
            <span className="pf-grade-text">
              <b>{grade.title}</b>
              <span>{grade.line}</span>
            </span>
            <span className="pf-grade-go" aria-hidden>
              →
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
