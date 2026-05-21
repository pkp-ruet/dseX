import { verdictHeadline, verdictTone } from "@/lib/plain-language";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function VerdictHero({ detail }: Props) {
  const { score_row, profile, verdict } = detail;
  const score = (score_row?.score as number | null) ?? null;
  const word = verdict?.headline ?? verdictHeadline(score);
  const tone = verdictTone(score);
  const tagline = verdict?.tagline ?? null;
  const sentences = verdict?.sentences ?? [];
  const horizonHint = verdict?.horizon_hint ?? null;

  // Ring geometry
  const size = 168;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const targetOffset = circumference * (1 - fillPct);

  const animName = `vh_ring_${profile.trading_code.toLowerCase()}`;

  const bullets = sentences.filter(Boolean);

  return (
    <section
      className="relative rounded-3xl overflow-hidden mb-8"
      style={{
        background: `linear-gradient(135deg, #0D1A2E 0%, #0A1525 60%, ${tone.soft} 100%)`,
        border: `1px solid ${tone.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.25), 0 0 60px ${tone.soft}`,
      }}
    >
      <style>{`
        @keyframes ${animName} {
          from { stroke-dashoffset: ${circumference}; }
          to   { stroke-dashoffset: ${targetOffset}; }
        }
      `}</style>

      <div className="p-6 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-5" style={{ color: "#CBD5E1" }}>
          Our Take on {profile.trading_code}
        </p>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          <div className="flex flex-col items-center shrink-0">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={stroke}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={tone.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={targetOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{
                    filter: `drop-shadow(0 0 8px ${tone.color}80)`,
                    animation: `${animName} 1s ease-out`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-black tabular-nums leading-none"
                  style={{ color: tone.color, fontSize: "2.75rem" }}
                >
                  {score != null ? score.toFixed(0) : "--"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "#CBD5E1" }}>
                  Our Score
                </span>
              </div>
            </div>
            <p className="text-[11px] mt-3 text-center leading-snug max-w-[180px]" style={{ color: "#94A3B8" }}>
              Our rating from 0–100, based on our own analysis of the company.
            </p>
          </div>

          <div className="text-left flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p
                className="font-black leading-none tracking-tight"
                style={{ color: tone.color, fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
              >
                {word}
              </p>
              {horizonHint && (
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap"
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
              <p className="text-[15px] sm:text-base font-semibold mt-4 leading-snug" style={{ color: "#F1F5F9" }}>
                {tagline}
              </p>
            )}
            {bullets.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {bullets.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] sm:text-[15px] leading-relaxed" style={{ color: "#E2E8F0" }}>
                    <span aria-hidden className="mt-[7px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : !tagline ? (
              <p className="text-[15px] sm:text-base mt-4 leading-relaxed" style={{ color: "#CBD5E1" }}>
                Our take on this stock — combining its financial health with how the market is treating it right now.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
