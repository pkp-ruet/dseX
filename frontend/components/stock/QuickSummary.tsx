import { generateVerdictSentence } from "@/lib/verdict";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function QuickSummary({ detail }: Props) {
  const { signal_flags } = detail;
  const verdictText = generateVerdictSentence(detail);

  return (
    <div
      className="rounded-xl p-4 sm:p-5 mb-5"
      style={{
        background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
        border: "1px solid #1E3A5F",
      }}
    >
      <p className="text-sm sm:text-base leading-relaxed mb-4" style={{ color: "#CBD5E1" }}>
        {verdictText}
      </p>

      {(signal_flags.green.length > 0 || signal_flags.red.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <FlagColumn
            title="Strengths"
            flags={signal_flags.green}
            accentColor="#34D399"
            bgColor="rgba(52,211,153,0.07)"
            borderColor="rgba(52,211,153,0.25)"
            icon="✓"
          />
          <FlagColumn
            title="Risks"
            flags={signal_flags.red}
            accentColor="#F87171"
            bgColor="rgba(248,113,113,0.07)"
            borderColor="rgba(248,113,113,0.25)"
            icon="⚠"
            emptyMessage="No red flags detected"
            emptyIsPositive
          />
        </div>
      )}
    </div>
  );
}

function FlagColumn({
  title,
  flags,
  accentColor,
  bgColor,
  borderColor,
  icon,
  emptyMessage,
  emptyIsPositive,
}: {
  title: string;
  flags: string[];
  accentColor: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  emptyMessage?: string;
  emptyIsPositive?: boolean;
}) {
  const items = flags.length > 0 ? flags : emptyMessage ? [emptyMessage] : [];
  if (items.length === 0) return null;
  const isPositiveEmpty = flags.length === 0 && emptyIsPositive;

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: accentColor }}>
        {title}
      </p>
      <div className="space-y-1.5">
        {items.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-2 px-3 rounded-lg text-xs font-medium leading-snug"
            style={{
              background: isPositiveEmpty ? "rgba(52,211,153,0.07)" : bgColor,
              border: `1px solid ${isPositiveEmpty ? "rgba(52,211,153,0.25)" : borderColor}`,
              color: isPositiveEmpty ? "#34D399" : accentColor,
            }}
          >
            <span className="shrink-0 mt-0.5 font-bold">
              {isPositiveEmpty ? "✓" : icon}
            </span>
            <span style={{ color: "#CBD5E1" }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
