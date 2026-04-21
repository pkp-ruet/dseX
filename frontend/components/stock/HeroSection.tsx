import Link from "next/link";
import StarButton from "@/components/ui/StarButton";
import { getTier, TIER_COLORS, TIER_LABELS } from "@/lib/constants";
import { taka, signed, abbrev } from "@/lib/formatters";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function HeroSection({ detail }: Props) {
  const { profile, latest_price, score_row } = detail;
  const code = profile.trading_code;

  const score = score_row?.score as number | null;
  const tier = getTier(score);
  const tierColor = TIER_COLORS[tier];

  const rank = score_row?.overall_rank as number | null;
  const total = score_row?.total_scored as number | null;
  const topPct = rank && total ? ((rank / total) * 100).toFixed(0) : null;

  const ltp = latest_price.ltp;
  const chg = latest_price.change_pct;
  const isPositive = chg != null && chg > 0;
  const isNegative = chg != null && chg < 0;

  const changeColor = chg == null ? "#94A3B8" : isPositive ? "#34D399" : isNegative ? "#F87171" : "#94A3B8";
  const changeBg    = chg == null ? "rgba(148,163,184,0.1)" : isPositive ? "rgba(52,211,153,0.12)" : isNegative ? "rgba(248,113,113,0.12)" : "rgba(148,163,184,0.1)";
  const changeBorder= chg == null ? "rgba(148,163,184,0.2)" : isPositive ? "rgba(52,211,153,0.3)" : isNegative ? "rgba(248,113,113,0.3)" : "rgba(148,163,184,0.2)";

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <li><Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li><Link href="/dsestockranking" className="hover:text-[var(--primary)] transition-colors">Rankings</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li aria-current="page" className="text-[var(--primary)] font-semibold">{code}</li>
        </ol>
      </nav>

      {/* Hero card */}
      <div
        className="relative rounded-2xl overflow-hidden mb-5"
        style={{
          background: `linear-gradient(135deg, #0A1628 0%, #0D1F3C 40%, ${tierColor}18 100%)`,
          border: `1px solid ${tierColor}30`,
          boxShadow: `0 0 40px ${tierColor}15, 0 4px 24px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Top glow bar */}
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent 0%, ${tierColor} 30%, ${tierColor}cc 70%, transparent 100%)`,
          }}
        />

        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

            {/* Left: identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1
                      className="text-3xl sm:text-4xl font-black tracking-tight leading-none"
                      style={{ color: "#F1F5F9" }}
                    >
                      {code}
                    </h1>
                    <span className="mt-0.5"><StarButton code={code} size="lg" /></span>
                  </div>

                  {profile.company_name && (
                    <p className="text-sm sm:text-base font-medium leading-snug mt-1.5 line-clamp-2" style={{ color: "#94A3B8" }}>
                      {profile.company_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {profile.sector && (
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      color: "#38BDF8",
                      background: "rgba(56,189,248,0.1)",
                      border: "1px solid rgba(56,189,248,0.25)",
                    }}
                  >
                    {profile.sector}
                  </span>
                )}
                {profile.market_category && (
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      color: "#A78BFA",
                      background: "rgba(167,139,250,0.1)",
                      border: "1px solid rgba(167,139,250,0.25)",
                    }}
                  >
                    Cat {profile.market_category}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {latest_price.volume != null && (
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
                      <rect x="3" y="12" width="4" height="9" rx="1"/>
                      <rect x="10" y="7" width="4" height="14" rx="1"/>
                      <rect x="17" y="3" width="4" height="18" rx="1"/>
                    </svg>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Vol {abbrev(latest_price.volume)}</span>
                  </div>
                )}
                {rank && topPct && (
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tierColor} strokeWidth="2.5">
                      <circle cx="12" cy="8" r="6"/><path d="M8 14l-4 7h16l-4-7"/>
                    </svg>
                    <span className="text-xs font-bold" style={{ color: tierColor }}>
                      #{rank} · Top {topPct}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: price + score */}
            <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start sm:items-end gap-4 shrink-0">

              {/* Price block */}
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#94A3B8" }}>
                  Last Price
                </p>
                <p
                  className="text-4xl sm:text-5xl font-black tabular-nums leading-none tracking-tight"
                  style={{ color: "#F1F5F9" }}
                >
                  {taka(ltp)}
                </p>
                {chg != null && (
                  <span
                    className="inline-flex items-center gap-1 mt-2 text-sm font-bold px-3 py-1.5 rounded-full"
                    style={{ color: changeColor, background: changeBg, border: `1px solid ${changeBorder}` }}
                  >
                    {isPositive ? "▲" : isNegative ? "▼" : "—"} {signed(chg)}%
                  </span>
                )}
              </div>

              {/* DSEF Score box */}
              <div
                className="flex flex-col items-center px-4 py-3 rounded-xl"
                style={{
                  background: `${tierColor}15`,
                  border: `1.5px solid ${tierColor}40`,
                  boxShadow: `0 0 20px ${tierColor}20`,
                  minWidth: "80px",
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: `${tierColor}bb` }}>
                  DSEF
                </span>
                <span className="text-4xl font-black tabular-nums leading-none" style={{ color: tierColor }}>
                  {score != null ? score.toFixed(1) : "--"}
                </span>
                <span className="text-[10px] font-semibold mt-1.5 text-center leading-tight" style={{ color: `${tierColor}cc` }}>
                  {TIER_LABELS[tier]}
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
