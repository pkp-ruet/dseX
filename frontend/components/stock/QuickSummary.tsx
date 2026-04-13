import { getTier, TIER_COLORS, TIER_LABELS, type TierKey } from "@/lib/constants";
import { generateVerdictSentence } from "@/lib/verdict";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

const GAUGE_SEGMENTS: { tier: TierKey; min: number; max: number }[] = [
  { tier: "avoid",         min: 0,  max: 50 },
  { tier: "keep_watching", min: 50, max: 60 },
  { tier: "cautious_buy",  min: 60, max: 65 },
  { tier: "safe_buy",      min: 65, max: 70 },
  { tier: "good_buy",      min: 70, max: 80 },
  { tier: "strong_buy",    min: 80, max: 100 },
];

export default function QuickSummary({ detail }: Props) {
  const { signal_flags } = detail;
  const score = detail.score_row?.score as number | null;
  const verdictText = generateVerdictSentence(detail);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 mb-4">
      {/* Verdict sentence */}
      <p className="text-sm leading-relaxed text-[var(--text)] mb-4">
        {verdictText}
      </p>

      {/* Score gauge */}
      <ScoreGauge score={score} />

      {/* Signal flags */}
      {(signal_flags.green.length > 0 || signal_flags.red.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <FlagColumn
            title="Strengths"
            flags={signal_flags.green}
            icon="✓"
            borderColor="var(--positive)"
            bgColor="#F0FDF4"
            textColor="#166534"
          />
          <FlagColumn
            title="Risks"
            flags={signal_flags.red}
            icon="⚠"
            borderColor="var(--negative)"
            bgColor="#FEF2F2"
            textColor="#991B1B"
            emptyMessage="No red flags detected"
            emptyIsPositive
          />
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score }: { score: number | null }) {
  const markerPos = score != null ? Math.min(Math.max(score, 0), 100) : null;

  return (
    <div className="mb-1">
      <div className="relative h-3 rounded-full overflow-hidden flex" role="meter" aria-label={`Score gauge: ${score ?? "N/A"} out of 100`}>
        {GAUGE_SEGMENTS.map((seg) => (
          <div
            key={seg.tier}
            className="h-full"
            style={{
              width: `${seg.max - seg.min}%`,
              background: TIER_COLORS[seg.tier],
              opacity: 0.8,
            }}
          />
        ))}
        {/* Marker */}
        {markerPos != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white"
            style={{ left: `${markerPos}%`, boxShadow: "0 0 4px rgba(0,0,0,0.5)" }}
          >
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "6px solid var(--text)",
              }}
            />
          </div>
        )}
      </div>
      {/* Tier labels */}
      <div className="flex text-xs mt-1 text-[var(--text-muted)]">
        {GAUGE_SEGMENTS.map((seg) => (
          <span
            key={seg.tier}
            className="text-center truncate"
            style={{ width: `${seg.max - seg.min}%`, fontSize: "0.6rem" }}
          >
            {TIER_LABELS[seg.tier]}
          </span>
        ))}
      </div>
    </div>
  );
}

function FlagColumn({
  title,
  flags,
  icon,
  borderColor,
  bgColor,
  textColor,
  emptyMessage,
  emptyIsPositive,
}: {
  title: string;
  flags: string[];
  icon: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  emptyMessage?: string;
  emptyIsPositive?: boolean;
}) {
  const items = flags.length > 0
    ? flags
    : emptyMessage
    ? [emptyMessage]
    : [];

  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: textColor }}>
        {title}
      </p>
      <div className="space-y-1.5">
        {items.map((f, i) => (
          <div
            key={i}
            className="py-1.5 px-2.5 rounded-md text-xs font-medium leading-snug"
            style={{
              background: bgColor,
              borderLeft: `3px solid ${borderColor}`,
              color: textColor,
            }}
          >
            <span className="mr-1.5">{flags.length === 0 && emptyIsPositive ? "\u2713" : icon}</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
