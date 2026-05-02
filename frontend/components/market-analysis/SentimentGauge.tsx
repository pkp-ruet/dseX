"use client";

interface Props {
  score: number;
}

const LABELS = [
  { max: 20, label: "Extreme Fear", color: "#dc2626" },
  { max: 35, label: "Fear", color: "#f97316" },
  { max: 50, label: "Neutral", color: "#eab308" },
  { max: 65, label: "Greed", color: "#84cc16" },
  { max: 80, label: "Strong Greed", color: "#22c55e" },
  { max: 100, label: "Extreme Greed", color: "#16a34a" },
];

function getLabel(score: number) {
  return LABELS.find((l) => score <= l.max) ?? LABELS[LABELS.length - 1];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

const SEGMENTS = [
  { start: -90, end: -54, color: "#dc2626" },
  { start: -54, end: -18, color: "#f97316" },
  { start: -18, end: 18, color: "#eab308" },
  { start: 18, end: 54, color: "#84cc16" },
  { start: 54, end: 90, color: "#16a34a" },
];

export default function SentimentGauge({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const { label, color } = getLabel(clamped);

  // Map 0–100 → -90° to +90°
  const needleAngle = -90 + (clamped / 100) * 180;
  const cx = 100;
  const cy = 90;
  const outerR = 72;
  const innerR = 52;

  const tip = polarToCartesian(cx, cy, outerR - 4, needleAngle);
  const base1 = polarToCartesian(cx, cy, 10, needleAngle - 90);
  const base2 = polarToCartesian(cx, cy, 10, needleAngle + 90);

  return (
    <div className="intel-signal-card intel-signal-card--full mb-4">
      <div className="intel-signal-title" style={{ color: "var(--primary)" }}>Market Sentiment</div>
      <div className="intel-signal-desc">Computed from breadth ratio, volume trend, and index direction.</div>
      <div className="flex flex-col items-center mt-2">
        <svg viewBox="0 0 200 100" width="260" height="130" aria-label={`Sentiment: ${label} (${clamped})`}>
          {SEGMENTS.map((seg, i) => (
            <path
              key={i}
              d={arcPath(cx, cy, outerR, seg.start + 90, seg.end + 90)}
              fill="none"
              stroke={seg.color}
              strokeWidth={18}
              strokeLinecap="butt"
              opacity={0.85}
            />
          ))}
          {/* Inner track */}
          <path
            d={arcPath(cx, cy, innerR, 0, 180)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={2}
            opacity={0.4}
          />
          {/* Needle */}
          <polygon
            points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
            fill={color}
            opacity={0.95}
          />
          {/* Hub */}
          <circle cx={cx} cy={cy} r={8} fill="var(--bg)" stroke={color} strokeWidth={2.5} />
          {/* Score text */}
          <text x={cx} y={cy - 16} textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
            {clamped}
          </text>
        </svg>
        <div className="text-sm font-semibold mt-1" style={{ color }}>{label}</div>
        <div className="flex justify-between w-full max-w-[260px] mt-1 text-[10px] text-[var(--text-muted)]">
          <span>Extreme Fear</span>
          <span>Extreme Greed</span>
        </div>
      </div>
    </div>
  );
}
