import { verdictHeadline, verdictTone, pickTopReasons, watchItems } from "@/lib/plain-language";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function VerdictHero({ detail }: Props) {
  const { signal_flags, score_row, profile } = detail;
  const score = (score_row?.score as number | null) ?? null;
  const word = verdictHeadline(score);
  const tone = verdictTone(score);

  const reasons = pickTopReasons(signal_flags, 3);
  const watch = watchItems(signal_flags);
  const greenOnlyWatch = watch.filter((w) => !reasons.some((r) => r.text === w));

  // Ring geometry
  const size = 168;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPct = score != null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const targetOffset = circumference * (1 - fillPct);

  const animName = `vh_ring_${profile.trading_code.toLowerCase()}`;

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
          Our Verdict
        </p>

        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-8 mb-6">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
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
                out of 100
              </span>
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <p
              className="font-black leading-none tracking-tight"
              style={{ color: tone.color, fontSize: "clamp(2.25rem, 6vw, 3.5rem)" }}
            >
              {word}
            </p>
            <p className="text-base sm:text-lg mt-3 leading-snug" style={{ color: "#CBD5E1" }}>
              Based on profits, dividends, finances, and how the company is priced today.
            </p>
          </div>
        </div>

        {reasons.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#CBD5E1" }}>
              Why we say this
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {reasons.map((r, i) => (
                <ReasonCard key={i} reason={r} />
              ))}
            </div>
          </div>
        )}

        {greenOnlyWatch.length > 0 && (
          <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#FBBF24" }}>
              Things to watch
            </p>
            <ul className="space-y-2">
              {greenOnlyWatch.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-snug"
                  style={{ color: "#CBD5E1" }}
                >
                  <span style={{ color: "#FBBF24", marginTop: "2px" }} aria-hidden="true">⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ReasonCard({ reason }: { reason: { type: "good" | "watch"; text: string } }) {
  const isGood = reason.type === "good";
  const accent = isGood ? "#34D399" : "#FBBF24";
  const bg     = isGood ? "rgba(52,211,153,0.06)" : "rgba(251,191,36,0.06)";
  const border = isGood ? "rgba(52,211,153,0.2)"  : "rgba(251,191,36,0.2)";
  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 28, height: 28, background: `${accent}18`, color: accent,
          fontSize: 16, fontWeight: 800,
        }}
        aria-hidden="true"
      >
        {isGood ? "✓" : "⚠"}
      </div>
      <p className="text-sm leading-snug font-medium" style={{ color: "#E2E8F0" }}>
        {reason.text}
      </p>
    </div>
  );
}
