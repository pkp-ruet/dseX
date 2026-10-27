import type { ReactNode } from "react";
import SignalChip from "@/components/ui/SignalChip";
import { T } from "@/components/i18n/T";
import { TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

/**
 * The page's colour key — one row, read once, and every card below becomes
 * readable: what the grade colours mean, which way a price moved, and what the
 * Buy / Sell chips are.
 *
 * A legend, not a method section: no weights, no pillars, no prose about how
 * the score is built (that lives on /about and stays off `/`). It has no box
 * of its own — it sits inside the TrustStrip band.
 */

const TIERS: TierKey[] = ["excellent", "good", "average", "weak"];

function Group({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-xs font-semibold text-text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">{children}</div>
    </div>
  );
}

export default function ColourKey() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr_1fr] sm:gap-6">
      <Group label={<T en="Company grade" bn="কোম্পানির গ্রেড" />}>
        {TIERS.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: TIER_VAR[t] }} aria-hidden />
            <span className="text-sm font-bold" style={{ color: TIER_VAR[t] }}>
              <T en={TIER_LABELS[t]} bn={TIER_LABELS_BN[t]} />
            </span>
          </span>
        ))}
      </Group>

      <Group label={<T en="Price today" bn="আজকের দাম" />}>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-positive">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 4 21 19H3z" />
          </svg>
          <T en="Up" bn="বেড়েছে" />
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-negative">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 20 3 5h18z" />
          </svg>
          <T en="Down" bn="কমেছে" />
        </span>
      </Group>

      <Group label={<T en="Today's signal" bn="আজকের সংকেত" />}>
        <SignalChip signal="buy" size="sm" />
        <SignalChip signal="sell" size="sm" />
      </Group>
    </div>
  );
}
