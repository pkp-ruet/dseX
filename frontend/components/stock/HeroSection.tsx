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

  const changeBadgeColor = chg == null ? "var(--text-muted)" : isPositive ? "var(--positive)" : isNegative ? "var(--negative)" : "var(--text-muted)";
  const changeBadgeBg    = chg == null ? "var(--border)"    : isPositive ? "#10B98122"         : isNegative ? "#EF444422"         : "var(--border)";
  const changeBadgeBorder= chg == null ? "var(--border)"    : isPositive ? "#10B98155"         : isNegative ? "#EF444455"         : "var(--border)";

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <li><Link href="/" className="text-[var(--primary)] hover:underline font-medium">Home</Link></li>
          <li aria-hidden="true" className="mx-1">&rsaquo;</li>
          <li><Link href="/dsestockranking" className="text-[var(--primary)] hover:underline font-medium">Rankings</Link></li>
          <li aria-hidden="true" className="mx-1">&rsaquo;</li>
          <li aria-current="page" className="font-semibold text-[var(--text)]">{code}</li>
        </ol>
      </nav>

      {/* Hero card */}
      <div
        className="relative rounded-[var(--radius)] border border-[var(--border)] overflow-hidden mb-4"
        style={{ background: "var(--surface)" }}
      >
        {/* 4px gradient top bar */}
        <div
          style={{
            height: "4px",
            background: `linear-gradient(90deg, ${tierColor} 0%, ${tierColor}99 60%, ${tierColor}33 100%)`,
          }}
        />

        {/* Card body with left border accent + gradient wash */}
        <div
          className="p-4 sm:p-5"
          style={{
            borderLeft: `4px solid ${tierColor}`,
            background: `linear-gradient(135deg, ${tierColor}0d 0%, transparent 55%)`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

            {/* Left: identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none"
                  style={{ color: "var(--text)" }}
                >
                  {code}
                </h1>
                <span className="hero-star mt-0.5"><StarButton code={code} size="lg" /></span>
              </div>

              {profile.company_name && (
                <p
                  className="text-base sm:text-lg font-semibold leading-snug mb-3 line-clamp-2"
                  style={{ color: "var(--text)" }}
                >
                  {profile.company_name}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.sector && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full leading-none"
                    style={{
                      color: "var(--primary)",
                      background: "rgba(79,70,229,0.10)",
                      border: "1px solid rgba(79,70,229,0.25)",
                    }}
                  >
                    {profile.sector}
                  </span>
                )}
                {profile.market_category && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full leading-none"
                    style={{
                      color: "var(--accent)",
                      background: "rgba(236,72,153,0.10)",
                      border: "1px solid rgba(236,72,153,0.25)",
                    }}
                  >
                    Cat {profile.market_category}
                  </span>
                )}
              </div>

              {(latest_price.volume != null || (rank && topPct)) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {latest_price.volume != null && (
                    <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                        <rect x="3" y="12" width="4" height="9" rx="1"/>
                        <rect x="10" y="7" width="4" height="14" rx="1"/>
                        <rect x="17" y="3" width="4" height="18" rx="1"/>
                      </svg>
                      Vol {abbrev(latest_price.volume)}
                    </span>
                  )}
                  {rank && topPct && (
                    <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: tierColor }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                        <circle cx="12" cy="8" r="6"/>
                        <path d="M8 14l-4 7h16l-4-7"/>
                      </svg>
                      #{rank} · Top {topPct}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: price + score */}
            <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start gap-3 shrink-0">
              <div className="text-right">
                <p
                  className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  {taka(ltp)}
                </p>
                {chg != null && (
                  <span
                    className="inline-flex items-center gap-1 mt-2 text-sm font-bold px-3 py-1 rounded-full"
                    style={{
                      color: changeBadgeColor,
                      background: changeBadgeBg,
                      border: `1px solid ${changeBadgeBorder}`,
                    }}
                  >
                    {isPositive ? "▲" : isNegative ? "▼" : "—"} {signed(chg)}%
                  </span>
                )}
              </div>

              <div
                className="flex flex-col items-center px-3 py-2 rounded-[var(--radius)]"
                style={{ background: `${tierColor}12`, border: `1.5px solid ${tierColor}40` }}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: tierColor }}>DSEF Score</span>
                <span className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: tierColor }}>
                  {score != null ? score.toFixed(1) : "--"}
                </span>
                <span className="text-[10px] font-semibold mt-1 leading-none" style={{ color: tierColor }}>
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
