"use client";
import { useEffect, useState } from "react";
import { verdictHeadline, verdictTone } from "@/lib/plain-language";
import SignalChip from "@/components/ui/SignalChip";
import type { StockSignalInfo } from "@/lib/api";
import { money } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
import { STOCK_JUMP_EVENT } from "@/components/stock/StockSectionNav";

interface Props {
  code: string;
  score: number | null;
  rank: number | null;
  total: number | null;
  signal?: StockSignalInfo | null;
  ltp: number | null;
  changePct: number | null;
}

export default function StickySummaryBar({
  code, score, rank, total, signal, ltp, changePct,
}: Props) {
  const [show, setShow] = useState(false);

  // Past the hero the bar appears. On a phone the navbar + this bar + the
  // section nav is ~170px of fixed chrome, so there it also hides while the
  // reader scrolls down and comes back the moment they scroll up.
  useEffect(() => {
    let lastY = window.scrollY;
    // A section-chip jump on a phone scrolls "up" for upward targets, which
    // would pop the bar in mid-scroll and push the heading under the chips.
    // StockSectionNav announces the jump; stay hidden until it settles.
    let holdHiddenUntil = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const pastHero = y > 320;
      const narrow = window.innerWidth < 640;
      if (!pastHero) {
        setShow(false);
      } else if (!narrow) {
        setShow(true);
      } else if (Date.now() < holdHiddenUntil) {
        setShow(false);
      } else if (y < lastY - 6) {
        setShow(true);
      } else if (y > lastY + 6) {
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
      className="overflow-hidden transition-all duration-200"
      style={{ maxHeight: show ? 56 : 0, opacity: show ? 1 : 0 }}
      aria-hidden={!show}
      inert={!show}
    >
      <div
        data-summary-inner
        className="flex items-center gap-2 sm:gap-3 py-2 px-3"
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
