import Bn from "@/components/i18n/Bn";
import SignalChip from "@/components/ui/SignalChip";
import { TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

/**
 * The page's colour key — one row, read once, and every card below becomes
 * readable: what the grade colours mean, which way a price moved, and what the
 * Buy / Sell chips are.
 *
 * A legend, not a method section: no weights, no pillars, no prose about how
 * the score is built (that lives on /about and stays off `/`).
 */

const TIERS: TierKey[] = ["excellent", "good", "average", "weak"];

function Group({ label, bn, children }: { label: string; bn: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
        {label} <Bn as="span" className="normal-case tracking-normal">· {bn}</Bn>
      </p>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">{children}</div>
    </div>
  );
}

export default function ColourKey() {
  return (
    <section
      aria-label="How to read the colours"
      className="soft-card grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-[1.6fr_1fr_1fr] sm:gap-6 sm:px-6"
    >
      <Group label="Company grade" bn="কোম্পানির মান">
        {TIERS.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: TIER_VAR[t] }} aria-hidden />
            <span className="text-sm font-bold" style={{ color: TIER_VAR[t] }}>
              {TIER_LABELS[t]}
            </span>
            <Bn as="span" className="text-xs text-text-muted">
              {TIER_LABELS_BN[t]}
            </Bn>
          </span>
        ))}
      </Group>

      <Group label="Price today" bn="আজকের দাম">
        <span className="inline-flex items-center gap-1 text-sm font-bold text-positive">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 4 21 19H3z" />
          </svg>
          Up <Bn as="span" className="text-xs font-medium text-text-muted">বেড়েছে</Bn>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-negative">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 20 3 5h18z" />
          </svg>
          Down <Bn as="span" className="text-xs font-medium text-text-muted">কমেছে</Bn>
        </span>
      </Group>

      <Group label="Today's signal" bn="আজকের সংকেত">
        <span className="inline-flex items-center gap-1.5">
          <SignalChip signal="buy" size="sm" />
          <Bn as="span" className="text-xs text-text-muted">কেনার মতো</Bn>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <SignalChip signal="sell" size="sm" />
          <Bn as="span" className="text-xs text-text-muted">বিক্রির মতো</Bn>
        </span>
      </Group>
    </section>
  );
}
