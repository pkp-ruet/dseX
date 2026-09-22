"use client";
import { useEffect, useRef, useState } from "react";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import type { StockSignalInfo } from "@/lib/api";
import { money, changePct as fmtChange, changeTone } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
import StockSectionNav, { type NavSection } from "@/components/stock/StockSectionNav";
import StickyStackMeasure, {
  BAR_H,
  NAVBAR_H,
  STOCK_BAR_VAR,
  STOCK_JUMP_EVENT,
} from "@/components/stock/StickyStackMeasure";

export { BAR_H, STOCK_BAR_VAR };

/** Ignore scroll wobble smaller than this before flipping the summary line on a phone. */
const DIRECTION_SLACK = 10;

interface Props {
  code: string;
  score: number | null;
  rank: number | null;
  total: number | null;
  signal?: StockSignalInfo | null;
  ltp: number | null;
  changePct: number | null;
  /** The section chips — the bar's second line. */
  sections: NavSection[];
}

/**
 * The stock page's ONE sticky element (2026-09-22 merge of the fixed summary
 * bar + the sticky section nav).
 *
 *   line 1  code · verdict · Buy chip · rank · star · price · change
 *   line 2  the section chips (StockSectionNav), always visible once pinned
 *
 * The element's in-flow height is the chip row only. Line 1 is absolutely
 * positioned ABOVE it (`.stock-summary-line`, bottom: 100%) and the element's
 * sticky `top` moves down by `--stock-bar-h` (globals.css `.stock-sticky-stack`)
 * to make room whenever line 1 shows. That keeps the earlier fix: a sticky
 * element's height still occupies space, so a line that opened/closed in flow
 * shifted the whole page and the browser's scroll anchoring turned that into a
 * jumping loop on phones. Moving `top` never changes the in-flow position.
 *
 * From sm up line 1 shows whenever the element is pinned. Below 640px it hides
 * while reading down and comes back on the first scroll up — the chips stay.
 */
export default function StickySummaryBar({
  code, score, rank, total, signal, ltp, changePct, sections,
}: Props) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Publish line 1's live height so the sticky top and hash jumps make room.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(STOCK_BAR_VAR, `${show ? BAR_H : 0}px`);
    return () => {
      root.style.removeProperty(STOCK_BAR_VAR);
    };
  }, [show]);

  useEffect(() => {
    const stack = ref.current;
    let lastY = window.scrollY;
    // A section-chip jump on a phone scrolls "up" for upward targets, which
    // would pop line 1 in mid-scroll and push the heading under the chips.
    // StockSectionNav announces the jump; stay hidden until it settles.
    let holdHiddenUntil = 0;
    const onScroll = () => {
      const y = window.scrollY;
      // Show only once the element is pinned under the navbar. When pinned its
      // top is exactly the sticky offset (with or without line 1's room), so
      // this stays true through line 1's own open/close — no feedback.
      const pinned = stack
        ? stack.getBoundingClientRect().top <= NAVBAR_H + BAR_H + 1
        : y > 320;
      const narrow = window.innerWidth < 640;
      if (!pinned) {
        setShow(false);
      } else if (!narrow) {
        setShow(true);
      } else if (Date.now() < holdHiddenUntil) {
        setShow(false);
      } else if (y < lastY - DIRECTION_SLACK) {
        setShow(true);
      } else if (y > lastY + DIRECTION_SLACK) {
        setShow(false);
      }
      lastY = y;
    };
    const onJump = () => {
      if (window.innerWidth < 640) {
        holdHiddenUntil = Date.now() + 1000;
        setShow(false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener(STOCK_JUMP_EVENT, onJump);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener(STOCK_JUMP_EVENT, onJump);
    };
  }, []);

  return (
    <div ref={ref} className="stock-sticky-stack z-40 -mx-4 sm:-mx-6">
      {/* Line 1 — overlays above the chip row while pinned */}
      <div
        data-summary-line
        className={`stock-summary-line transition-[transform,opacity] duration-200 motion-reduce:transition-none ${
          show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
        aria-hidden={!show}
        inert={!show}
      >
        <div
          data-summary-inner
          className="h-full flex items-center gap-2 sm:gap-3 px-3 bg-surface/90 backdrop-blur border-b border-border"
        >
          {/* everything here is shrink-0, so the code is the one thing that ellipsises */}
          <span className="font-bold text-sm shrink-0 max-w-[5.5rem] truncate text-text-main">{code}</span>
          {/* score ring + tier word: from sm up — on a 360px phone code + Buy chip + star + price + % fills the line */}
          {score != null && (
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0">
              <ScoreBadge score={score} size="sm" />
              <TierPill score={score} size="sm" />
            </span>
          )}
          {signal && (
            <SignalChip
              signal={signal.signal}
              strength={signal.strength}
              reason={signal.reason_en}
              size="sm"
              className="shrink-0"
            />
          )}

          {rank != null && total != null && (
            <span className="hidden md:inline text-xs text-text-muted">
              Rank <b className="text-text-main">#{rank}</b> of {total}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0 tabular-nums">
            <StarButton code={code} size="md" />
            <span className="font-bold text-sm text-text-main">{money(ltp)}</span>
            {changePct != null && (
              <span className={`text-xs font-semibold ${changeTone(changePct)}`}>
                {fmtChange(changePct)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Line 2 — the chips; this is the element's in-flow height */}
      <StockSectionNav sections={sections} />
      {/* writes the in-flow height to --stock-sticky-h for .stock-anchor */}
      <StickyStackMeasure />
    </div>
  );
}
