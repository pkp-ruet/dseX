import { generateVerdictSentence } from "@/lib/verdict";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function QuickSummary({ detail }: Props) {
  const { signal_flags } = detail;
  const verdictText = generateVerdictSentence(detail);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 mb-4">
      {/* Verdict sentence */}
      <p className="text-sm leading-relaxed text-[var(--text)] mb-4">
        {verdictText}
      </p>

      {/* Signal flags */}
      {(signal_flags.green.length > 0 || signal_flags.red.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
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
