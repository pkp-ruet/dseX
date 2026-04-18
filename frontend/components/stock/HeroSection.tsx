import Link from "next/link";
import ScoreBadge from "@/components/ui/ScoreBadge";
import StarButton from "@/components/ui/StarButton";
import TierPill from "@/components/ui/TierPill";
import { getTier, TIER_COLORS } from "@/lib/constants";
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
  const w52High = latest_price.w52_high;
  const w52Low = latest_price.w52_low;

  // 52W range position (0-100%)
  const rangePos =
    ltp && w52High && w52Low && w52High !== w52Low
      ? ((ltp - w52Low) / (w52High - w52Low)) * 100
      : null;

  const changeColor =
    latest_price.change_pct == null
      ? "text-gray-400"
      : latest_price.change_pct > 0
      ? "text-[var(--positive)]"
      : latest_price.change_pct < 0
      ? "text-[var(--negative)]"
      : "text-gray-500";

  const changeBg =
    latest_price.change_pct == null
      ? "bg-gray-50"
      : latest_price.change_pct > 0
      ? "bg-green-50"
      : latest_price.change_pct < 0
      ? "bg-red-50"
      : "bg-gray-50";

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <li>
            <Link href="/" className="text-[var(--primary)] hover:underline font-medium">Home</Link>
          </li>
          <li aria-hidden="true" className="mx-1">&rsaquo;</li>
          <li>
            <Link href="/dsestockranking" className="text-[var(--primary)] hover:underline font-medium">Rankings</Link>
          </li>
          <li aria-hidden="true" className="mx-1">&rsaquo;</li>
          <li aria-current="page" className="font-semibold text-[var(--text)]">{code}</li>
        </ol>
      </nav>

      {/* Hero card */}
      <div
        className="stock-hero rounded-[var(--radius)] border border-[var(--border)] p-4 sm:p-5 mb-4"
        style={{ background: `linear-gradient(135deg, ${tierColor}08, transparent 60%)` }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Left: Score block */}
          <div className="flex flex-col items-center gap-1.5 sm:min-w-[100px]">
            <ScoreBadge score={score} size="xl" />
            <TierPill tier={tier} />
            {rank && total && (
              <span className="text-xs text-[var(--text-muted)]">
                #{rank} of {total}
                {topPct && <span className="ml-1 opacity-70">(Top {topPct}%)</span>}
              </span>
            )}
          </div>

          {/* Center: Company identity */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{code}</h1>
              <span className="hero-star"><StarButton code={code} size="lg" /></span>
              {profile.company_name && (
                <span className="text-base text-[var(--text-muted)] truncate">{profile.company_name}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile.sector && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-muted)] font-medium">
                  {profile.sector}
                </span>
              )}
              {profile.market_category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-muted)] font-medium">
                  Cat {profile.market_category}
                </span>
              )}
            </div>

            {/* 52W Range Bar */}
            {rangePos != null && w52Low != null && w52High != null && (
              <div className="mt-3 max-w-xs">
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-0.5">
                  <span>52W Low</span>
                  <span>52W High</span>
                </div>
                <div className="relative h-1.5 bg-[var(--border)] rounded-full">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md"
                    style={{
                      left: `${Math.min(Math.max(rangePos, 2), 98)}%`,
                      background: "var(--primary)",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-medium mt-0.5">
                  <span className="text-[var(--negative)]">{taka(w52Low)}</span>
                  <span className="text-[var(--positive)]">{taka(w52High)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Price block */}
          <div className="flex flex-col items-end sm:items-end gap-1 sm:min-w-[140px]">
            <span className="text-xs text-[var(--text-muted)]">Last Price</span>
            <span className="text-3xl font-bold tracking-tight">{taka(ltp)}</span>
            {latest_price.change_pct != null && (
              <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${changeColor} ${changeBg}`}>
                {signed(latest_price.change_pct)}%
              </span>
            )}
            {latest_price.volume != null && (
              <span className="text-xs text-[var(--text-muted)]">
                Vol: {abbrev(latest_price.volume)}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
