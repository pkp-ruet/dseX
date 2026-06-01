const ROWS = [
  { code: "GP", name: "Grameenphone", chg: 1.8, note: "Q3 dividend declared" },
  { code: "SQURPHARMA", name: "Square Pharma", chg: -0.6, note: "New plant approved" },
  { code: "BATBC", name: "British American Tobacco", chg: 0.9, note: "Record date 12 Jun" },
  { code: "RENATA", name: "Renata Ltd", chg: 2.4, note: "Earnings beat" },
];

/** Static, illustrative mockup of the saved-stocks watchlist with news. */
export default function WatchlistMockup() {
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">★ My Watchlist</span>
        <span className="text-[0.62rem] text-[var(--text-muted)]">4 stocks · 2 news today</span>
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {ROWS.map((r) => {
          const up = r.chg >= 0;
          return (
            <div key={r.code} className="flex items-center gap-3 px-4 py-3">
              <span className="text-[var(--watch)]" aria-hidden="true">★</span>
              <span className="min-w-0 flex-1">
                <span className="ticker-tag ticker-tag--static text-[0.8rem]">{r.code}</span>
                <span className="block text-[0.68rem] text-[var(--text-muted)] truncate">{r.note}</span>
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: up ? "var(--positive)" : "var(--negative)" }}
              >
                {up ? "+" : ""}{r.chg.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
