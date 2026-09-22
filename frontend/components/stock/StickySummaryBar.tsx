"use client";
import { useEffect, useRef, useState } from "react";
import { verdictHeadline, verdictTone } from "@/lib/plain-language";
import SignalChip from "@/components/ui/SignalChip";
import type { StockSignalInfo } from "@/lib/api";
import { money } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
import { STOCK_JUMP_EVENT } from "@/components/stock/StockSectionNav";

/** Fixed navbar height (layout.tsx `h-14`). */
const NAVBAR_H = 56;
/** The bar's fixed height. The sticky stack's `top` and `.stock-anchor`'s
 *  scroll margin both read it through STOCK_BAR_VAR. */
export const BAR_H = 48;
/** CSS custom property on <html>: `${BAR_H}px` while the bar shows, else 0px. */
export const STOCK_BAR_VAR = "--stock-bar-h";
/** Ignore scroll wobble smaller than this before flipping the bar on a phone. */
const DIRECTION_SLACK = 10;

interface Props {
  code: string;
  score: number | null;
  rank: number | null;
  total: number | null;
  signal?: StockSignalInfo | null;
  ltp: number | null;
  changePct: number | null;
}

/**
 * The summary bar is `position: fixed` and OUT of the page flow on purpose.
 *
 * It used to be an in-flow child of the sticky stack that animated its
 * max-height 0↔56px. A sticky element still takes up space, so every toggle
 * pushed the whole page below it down or up by 56px. Worse, the browser's
 * scroll anchoring then corrected `scrollY` to keep the reader's text still,
 * that correction fired a scroll event, the direction check read it as the
 * reader scrolling the other way and flipped the bar again — the page
 * "kept jumping" on phones until the gesture ended.
 *
 * Now the bar overlays the viewport under the navbar, and the sticky stack
 * (`.stock-sticky-stack`) moves its `top` down by `--stock-bar-h` to make
 * room. Sticky `top` only changes where the stack pins, never its in-flow
 * position, so the content never shifts and nothing feeds back into scroll.
 */
export default function StickySummaryBar({
  code, score, rank, total, signal, ltp, changePct,
}: Props) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Publish the bar's live height so the sticky stack and hash jumps make room.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(STOCK_BAR_VAR, `${show ? BAR_H : 0}px`);
    return () => {
      root.style.removeProperty(STOCK_BAR_VAR);
    };
  }, [show]);

  useEffect(() => {
    // The bar's parent is the sticky stack it sits above (page.tsx).
    const stack = ref.current?.parentElement;
    let lastY = window.scrollY;
    // A section-chip jump on a phone scrolls "up" for upward targets, which
    // would pop the bar in mid-scroll and push the heading under the chips.
    // StockSectionNav announces the jump; stay hidden until it settles.
    let holdHiddenUntil = 0;
    const onScroll = () => {
      const y = window.scrollY;
      // Show only once the stack is pinned under the navbar. When pinned its
      // top is exactly the sticky offset (with or without the bar's room), so
      // this stays true through the bar's own open/close — no feedback.
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
        // Phones: the navbar + bar + chips is a lot of fixed chrome, so the bar
        // hides while reading down and comes back on the first scroll up.
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

  const tone = verdictTone(score);
  const word = verdictHeadline(score);
  const chgColor = changePct == null ? "var(--text-muted)" : changePct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <div
      ref={ref}
      className="fixed left-0 right-0 top-14 z-40 transition-[transform,opacity] duration-200 motion-reduce:transition-none"
      style={{
        height: BAR_H,
        transform: show ? "translateY(0)" : "translateY(-100%)",
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
      }}
      aria-hidden={!show}
      inert={!show}
    >
      {/* max-w-5xl matches <main>, so the bar lines up with the chip row below it */}
      <div
        data-summary-inner
        className="max-w-5xl mx-auto h-full flex items-center gap-2 sm:gap-3 px-3"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* everything in this bar is shrink-0, so the code is the one thing that ellipsises */}
        <span className="font-bold text-sm shrink-0 max-w-[5.5rem] truncate" style={{ color: "var(--text)" }}>{code}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
        >
          {word}{score != null ? ` ${Math.round(score)}` : ""}
        </span>
        {signal && (
          <SignalChip
            signal={signal.signal}
            strength={signal.strength}
            reason={signal.reason_en}
            /* phones: code + verdict + Strong Buy + star + price + % is ~440px at 360px,
               so the bar clipped its own price. The hero and verdict already show the chip. */
            className="hidden sm:inline-flex shrink-0"
          />
        )}

        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          {rank != null && total != null && (
            <span>Rank <b style={{ color: "var(--text)" }}>#{rank}</b> of {total}</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0 tabular-nums">
          <StarButton code={code} size="md" />
          <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{money(ltp)}</span>
          {changePct != null && (
            <span className="text-xs font-semibold" style={{ color: chgColor }}>
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
