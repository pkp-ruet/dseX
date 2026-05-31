import { verdictHeadline, verdictTone } from "@/lib/plain-language";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function VerdictHero({ detail }: Props) {
  const { score_row, profile, verdict, latest_price } = detail;
  const ltp = latest_price?.ltp;
  const score = (score_row?.score as number | null) ?? null;
  const word = verdict?.headline ?? verdictHeadline(score);
  const tone = verdictTone(score);
  const tagline = verdict?.tagline ?? null;
  const sentences = verdict?.sentences ?? [];
  const horizonHint = verdict?.horizon_hint ?? null;

  // Ring geometry
  const size = 140;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const targetOffset = circumference * (1 - fillPct);

  const animName = `vh_ring_${profile.trading_code.toLowerCase()}`;
  const bullets = sentences.filter(Boolean);
  const companyName = profile.company_name || profile.trading_code;

  return (
    <section
      className="relative rounded-3xl overflow-hidden mb-8"
      style={{
        background: `radial-gradient(120% 90% at 0% 0%, ${tone.soft} 0%, transparent 55%), radial-gradient(110% 80% at 100% 100%, ${tone.soft} 0%, transparent 50%), var(--surface)`,
        border: `1px solid ${tone.border}`,
        boxShadow: `0 12px 48px rgba(15,23,42,0.1), 0 0 80px ${tone.soft}`,
      }}
    >
      <style>{`
        @keyframes ${animName} {
          from { stroke-dashoffset: ${circumference}; }
          to   { stroke-dashoffset: ${targetOffset}; }
        }
      `}</style>

      {/* Top accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: `linear-gradient(90deg, transparent 0%, ${tone.color} 50%, transparent 100%)`,
          opacity: 0.85,
        }}
      />
      {/* Decorative corner glyphs */}
      <div
        aria-hidden
        className="absolute -top-16 -right-16 rounded-full opacity-30 blur-3xl"
        style={{ width: 240, height: 240, background: tone.color }}
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -left-20 rounded-full opacity-20 blur-3xl"
        style={{ width: 260, height: 260, background: tone.color }}
      />

      <div className="relative p-5 sm:p-7">
        {/* Brand strip */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: tone.color, boxShadow: `0 0 10px ${tone.color}` }}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] flex items-center gap-1.5">
            <span
              style={{
                background: "linear-gradient(90deg, var(--primary) 0%, var(--accent) 50%, var(--np-cautious) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              TopStockBD
            </span>
            <span style={{ color: "var(--text-muted)" }}>Analysis on —</span>
          </span>
        </div>

        {/* Company name — hero */}
        <div className="mb-4">
          <h2
            className="font-black tracking-tight leading-[1.05]"
            style={{
              color: "var(--text)",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            }}
          >
            {companyName}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums"
              style={{
                color: tone.color,
                background: tone.bg,
                border: `1px solid ${tone.border}`,
              }}
            >
              {profile.trading_code}
            </span>
            {profile.sector && (
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  color: "var(--np-cautious)",
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.3)",
                }}
              >
                {profile.sector}
              </span>
            )}
            {ltp != null && (
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full tabular-nums"
                style={{
                  color: "var(--watch)",
                  background: "rgba(180,83,9,0.1)",
                  border: "1px solid rgba(180,83,9,0.3)",
                }}
              >
                Latest Price: ৳{ltp.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Score + Verdict */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-7">
          <div className="flex flex-col items-center shrink-0">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Fundamental Score
            </span>
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id={`grad_${animName}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={tone.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={tone.color} stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--surface-2)"
                  strokeWidth={stroke}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={`url(#grad_${animName})`}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={targetOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    filter: `drop-shadow(0 0 12px ${tone.color}AA)`,
                    animation: `${animName} 1.2s cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-black tabular-nums leading-none"
                  style={{
                    color: tone.color,
                    fontSize: "2.5rem",
                    textShadow: `0 0 20px ${tone.color}80`,
                  }}
                >
                  {score != null ? score.toFixed(0) : "--"}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  / 100
                </span>
              </div>
            </div>
          </div>

          <div className="text-left flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p
                className="font-black leading-none tracking-tight"
                style={{
                  color: tone.color,
                  fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
                  textShadow: `0 0 28px ${tone.color}50`,
                }}
              >
                {word}
              </p>
              {horizonHint && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{
                    color: tone.color,
                    background: tone.bg,
                    border: `1px solid ${tone.border}`,
                  }}
                >
                  {horizonHint}
                </span>
              )}
            </div>
            {tagline && (
              <p
                className="text-sm sm:text-base font-semibold mt-3 leading-snug"
                style={{ color: "var(--text)" }}
              >
                {tagline}
              </p>
            )}
            {bullets.length > 0 ? (
              <ul className="mt-2.5 space-y-1.5">
                {bullets.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-[13px] sm:text-sm leading-snug"
                    style={{ color: "var(--text)" }}
                  >
                    <span
                      aria-hidden
                      className="mt-[6px] h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        background: tone.color,
                        boxShadow: `0 0 6px ${tone.color}`,
                      }}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : !tagline ? (
              <p className="text-[15px] sm:text-base mt-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Our take on this stock — combining its financial health with how the market is treating it right now.
              </p>
            ) : null}
          </div>
        </div>

        {/* Footer watermark — for shared screenshots */}
        <div
          className="mt-5 pt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span
            style={{
              background: "linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            topstockbd.com
          </span>
          <span style={{ color: "var(--text-muted)" }}>DSE Stock Analysis</span>
        </div>
      </div>
    </section>
  );
}
