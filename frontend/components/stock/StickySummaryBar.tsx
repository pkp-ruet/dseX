"use client";
import { useEffect, useState } from "react";
import { verdictHeadline, verdictTone } from "@/lib/plain-language";
import SignalChip from "@/components/ui/SignalChip";
import type { StockSignalInfo } from "@/lib/api";

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

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tone = verdictTone(score);
  const word = verdictHeadline(score);
  const ltpFmt = ltp == null ? "--" : ltp >= 100 ? Math.round(ltp).toLocaleString() : ltp.toFixed(1);
  const chgColor = changePct == null ? "var(--text-muted)" : changePct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <div
      className="overflow-hidden transition-all duration-200"
      style={{ maxHeight: show ? 56 : 0, opacity: show ? 1 : 0 }}
      aria-hidden={!show}
    >
      <div
        className="flex items-center gap-2 sm:gap-3 py-2 px-3"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span className="font-bold text-sm shrink-0" style={{ color: "var(--text)" }}>{code}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
        >
          {word}{score != null ? ` ${Math.round(score)}` : ""}
        </span>
        {signal && (
          <SignalChip signal={signal.signal} reason={signal.reason_en} className="shrink-0" />
        )}

        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          {rank != null && total != null && (
            <span>Rank <b style={{ color: "var(--text)" }}>#{rank}</b> of {total}</span>
          )}
        </div>

        <div className="ml-auto flex items-baseline gap-1.5 shrink-0 tabular-nums">
          <span className="font-bold text-sm" style={{ color: "var(--text)" }}>৳{ltpFmt}</span>
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
