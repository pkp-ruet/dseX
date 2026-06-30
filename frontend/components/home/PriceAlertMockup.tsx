const BELL = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// Two stocks being watched + one that just hit its target — tells the payoff story.
const ROWS = [
  { code: "GP", now: 312.5, target: 330, status: "watching" as const },
  { code: "SQURPHARMA", now: 215.0, target: 200, status: "watching" as const },
  { code: "ROBI", now: 30.2, target: 30, status: "hit" as const },
];

/** Static, illustrative mockup of the price-alerts feature. Mirrors the
 *  soft-card footprint of the other feature mockups. */
export default function PriceAlertMockup() {
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          <span className="text-[var(--watch)]">{BELL}</span> My Alerts
        </span>
        <span className="text-[0.62rem] text-[var(--text-muted)]">we watch the price for you</span>
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {ROWS.map((r) => {
          const hit = r.status === "hit";
          const accent = hit ? "var(--positive)" : "var(--watch)";
          const up = r.target >= r.now;
          return (
            <div key={r.code} className="flex items-center gap-3 px-4 py-3">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-[0.85rem]"
                style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                aria-hidden="true"
              >
                {hit ? "🎯" : BELL}
              </span>
              <span className="min-w-0 flex-1">
                <span className="ticker-tag ticker-tag--static text-[0.8rem]">{r.code}</span>
                <span className="block text-[0.66rem] text-[var(--text-muted)]">
                  {hit ? `Hit ৳${r.target} today` : up ? `Rises to ৳${r.target}` : `Drops to ৳${r.target}`}
                </span>
              </span>
              {hit ? (
                <span
                  className="text-[0.6rem] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full"
                  style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
                >
                  Hit 🎯
                </span>
              ) : (
                <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
                  ৳{r.now.toFixed(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
