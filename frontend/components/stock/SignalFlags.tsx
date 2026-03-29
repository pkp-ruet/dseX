import SectionLabel from "@/components/ui/SectionLabel";
import type { SignalFlags as SignalFlagsType } from "@/lib/api";

interface Props {
  flags: SignalFlagsType;
}

export default function SignalFlags({ flags }: Props) {
  if (!flags.green.length && !flags.red.length) return null;

  return (
    <div className="mb-4">
      <SectionLabel>Signal Flags</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <div className="flex flex-wrap gap-1">
          {flags.green.length > 0
            ? flags.green.map((f) => (
                <span key={f} className="flag-green">&#10003; {f}</span>
              ))
            : <span className="text-xs text-[var(--text-muted)]">No green flags detected.</span>
          }
        </div>
        <div className="flex flex-wrap gap-1">
          {flags.red.length > 0
            ? flags.red.map((f) => (
                <span key={f} className="flag-red">&#9888; {f}</span>
              ))
            : <span className="flag-green">&#10003; No red flags detected</span>
          }
        </div>
      </div>
    </div>
  );
}
