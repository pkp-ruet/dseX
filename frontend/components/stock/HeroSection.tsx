import Link from "next/link";
import StarButton from "@/components/ui/StarButton";
import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import { taka, signed } from "@/lib/formatters";
import { range52wInfo } from "@/lib/plain-language";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function HeroSection({ detail }: Props) {
  const { profile, latest_price } = detail;
  const code = profile.trading_code;

  const ltp = latest_price.ltp;
  const chg = latest_price.change_pct;
  const isPositive = chg != null && chg > 0;
  const isNegative = chg != null && chg < 0;

  const changeColor = chg == null ? "#94A3B8" : isPositive ? "#34D399" : isNegative ? "#F87171" : "#94A3B8";
  const changeBg     = chg == null ? "rgba(148,163,184,0.1)" : isPositive ? "rgba(52,211,153,0.14)" : isNegative ? "rgba(248,113,113,0.14)" : "rgba(148,163,184,0.1)";
  const changeBorder = chg == null ? "rgba(148,163,184,0.2)" : isPositive ? "rgba(52,211,153,0.4)"  : isNegative ? "rgba(248,113,113,0.4)"  : "rgba(148,163,184,0.2)";

  const range = range52wInfo(ltp, latest_price.w52_high, latest_price.w52_low);
  const rangeColor =
    range?.tone === "high" ? "#34D399" :
    range?.tone === "low"  ? "#F87171" : "#60A5FA";

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <li><Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li><Link href="/dsestockranking" className="hover:text-[var(--primary)] transition-colors">Rankings</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li aria-current="page" className="text-[var(--primary)] font-semibold">{code}</li>
        </ol>
      </nav>

      <div
        className="relative rounded-3xl overflow-hidden mb-8"
        style={{
          background: "linear-gradient(135deg, #0A1628 0%, #0D1F3C 50%, #102749 100%)",
          border: "1px solid rgba(56,189,248,0.18)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(14,165,233,0.05)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.6) 50%, transparent 100%)",
          }}
        />

        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-6">

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">

              <div className="flex-1 min-w-0">
                {profile.company_name && (
                  <h1
                    className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-3"
                    style={{ color: "#F1F5F9" }}
                  >
                    {profile.company_name}
                  </h1>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full"
                    style={{ background: "rgba(56,189,248,0.12)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.3)" }}
                  >
                    {code}
                  </span>
                  {profile.sector && (
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ color: "#A78BFA", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)" }}
                    >
                      {profile.sector}
                    </span>
                  )}
                  <span className="ml-1"><StarButton code={code} size="lg" /></span>
                  <AddToPortfolioButton code={code} ltp={ltp} />
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#CBD5E1" }}>
                  Last Price
                </p>
                <div className="flex items-baseline gap-3 sm:justify-end">
                  <span
                    className="font-black tabular-nums leading-none tracking-tight"
                    style={{
                      color: "#F8FAFC",
                      fontSize: "clamp(3rem, 9vw, 4.5rem)",
                    }}
                  >
                    {ltp != null ? ltp.toFixed(1) : "--"}
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold" style={{ color: "#94A3B8" }}>৳</span>
                </div>
                {chg != null && (
                  <span
                    className="inline-flex items-center gap-1.5 mt-3 text-base font-bold px-4 py-1.5 rounded-full"
                    style={{ color: changeColor, background: changeBg, border: `1px solid ${changeBorder}` }}
                  >
                    <span aria-hidden="true">{isPositive ? "▲" : isNegative ? "▼" : "—"}</span>
                    {signed(chg)}% today
                  </span>
                )}
              </div>
            </div>

            {range && latest_price.w52_high != null && latest_price.w52_low != null && (
              <div className="pt-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-xs font-medium" style={{ color: "#CBD5E1" }}>
                  <span className="tabular-nums">Low {taka(latest_price.w52_low, 1)}</span>
                  <span className="text-center" style={{ color: rangeColor, fontWeight: 700 }}>{range.caption}</span>
                  <span className="tabular-nums">High {taka(latest_price.w52_high, 1)}</span>
                </div>
                <div
                  className="relative h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      left: `${range.position * 100}%`,
                      width: "14px",
                      height: "14px",
                      background: rangeColor,
                      boxShadow: `0 0 0 3px rgba(8,14,26,1), 0 0 12px ${rangeColor}`,
                    }}
                  />
                </div>
                <p className="text-xs mt-2 text-center sm:text-left" style={{ color: "#CBD5E1" }}>
                  Where today's price sits in its 52-week range
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
