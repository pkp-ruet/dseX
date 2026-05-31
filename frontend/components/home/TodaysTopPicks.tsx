"use client";

import Link from "next/link";
import type { DailyPickResponse, DailyPickItem } from "@/lib/api";

interface Props {
  data: DailyPickResponse;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function chgColor(v: number | null | undefined): string {
  if (v == null) return "var(--text-muted)";
  if (v > 0) return "#34D399";
  if (v < 0) return "#F87171";
  return "var(--text-muted)";
}

function fmtPickDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const day = d.toLocaleDateString("en-GB", { day: "numeric" });
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    return `${day} ${month}`;
  } catch {
    return iso;
  }
}

function PickRow({ pick }: { pick: DailyPickItem }) {
  const sourceColor = pick.source === "dsef" ? "#4ADE80" : "#60A5FA";
  const sourceBg = pick.source === "dsef" ? "rgba(74,222,128,0.12)" : "rgba(96,165,250,0.12)";

  return (
    <Link
      href={`/stock/${pick.trading_code}`}
      className="flex items-start gap-3 p-3.5 sm:p-4 md:p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--primary)]/50 transition-colors group relative overflow-hidden"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: sourceColor }}
      />

      <div className="flex-1 min-w-0 pl-1">
        {/* Row 1: company code on its own line */}
        <p className="text-lg sm:text-xl md:text-base lg:text-lg font-extrabold text-[var(--text)] leading-tight truncate mb-1">
          {pick.trading_code}
        </p>

        {/* Row 2: tag + price change */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap px-2 py-0.5 rounded-full shrink-0"
            style={{ background: sourceBg, color: sourceColor }}
          >
            {pick.source_label}
          </span>
          {pick.change_pct != null && (
            <span className="text-sm sm:text-base font-bold whitespace-nowrap" style={{ color: chgColor(pick.change_pct) }}>
              {fmtPct(pick.change_pct)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-xs sm:text-sm mb-1.5">
          {pick.ltp != null && (
            <span className="text-[var(--text)] font-semibold">৳{pick.ltp.toFixed(2)}</span>
          )}
          {pick.return_7d_pct != null && (
            <span className="text-[11px] sm:text-xs text-[var(--text-muted)]">
              7d:{" "}
              <span className="font-semibold" style={{ color: chgColor(pick.return_7d_pct) }}>
                {fmtPct(pick.return_7d_pct)}
              </span>
            </span>
          )}
        </div>

        {pick.reasons.length > 0 && (
          <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed line-clamp-2">
            <span className="text-green-500 font-bold mr-1" aria-hidden="true">✓</span>
            {pick.reasons[0]}
          </p>
        )}
      </div>

      <span className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors self-center shrink-0" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </span>
    </Link>
  );
}

export default function TodaysTopPicks({ data }: Props) {
  const { picks, yesterday } = data;
  if (!picks.length) return null;

  return (
    <section
      aria-label="Today's top stock picks"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden h-full flex flex-col min-h-[400px] sm:min-h-[440px] md:min-h-0"
    >
      <div
        className="h-1.5 w-full"
        style={{ background: "linear-gradient(90deg, #FBBF24, #F97316)" }}
      />

      <div className="p-5 sm:p-6 md:p-5 flex flex-col flex-1">
        {/* Big centered title */}
        <div className="text-center mb-4 sm:mb-5">
          <p className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-extrabold leading-[1.05] tracking-tight" style={{ color: "#F97316" }}>
            <span aria-hidden="true">★</span> Today&apos;s Top Picks
          </p>
        </div>

        {/* 3 picks — stacked on mobile, 3-column row on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
          {picks.map((p) => (
            <PickRow key={`${p.slot}-${p.trading_code}`} pick={p} />
          ))}
        </div>

        {/* Yesterday's recap + history link */}
        <div className="mt-auto pt-3 border-t border-[var(--border)] text-xs sm:text-sm">
          {yesterday && yesterday.picks.length > 0 ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[var(--text-muted)]">
                Yesterday:{" "}
                {yesterday.picks.map((y, i) => (
                  <span key={`${y.slot}-${y.trading_code}`}>
                    <Link
                      href={`/stock/${y.trading_code}`}
                      className="font-bold text-[var(--text)] hover:underline"
                    >
                      {y.trading_code}
                    </Link>
                    {y.next_day_return_pct != null && (
                      <span className="font-semibold ml-1" style={{ color: chgColor(y.next_day_return_pct) }}>
                        {fmtPct(y.next_day_return_pct)}
                      </span>
                    )}
                    {i < yesterday.picks.length - 1 && (
                      <span className="text-[var(--text-muted)] mx-1.5">·</span>
                    )}
                  </span>
                ))}
              </span>
              <Link
                href="/top-picks"
                className="text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                History →
              </Link>
            </div>
          ) : (
            <div className="text-right">
              <Link
                href="/top-picks"
                className="text-[var(--accent)] hover:underline"
              >
                See pick history →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
