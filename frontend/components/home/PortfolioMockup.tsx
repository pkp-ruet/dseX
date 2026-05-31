const SUBSCORES = [
  { label: "Spread", value: 7.5, hint: "Diversification", color: "var(--positive)" },
  { label: "Quality", value: 8.2, hint: "Company strength", color: "var(--positive)" },
  { label: "Entry", value: 5.4, hint: "Buy prices", color: "var(--watch)" },
];

const INSIGHTS: { tone: "good" | "warn"; text: string }[] = [
  { tone: "good", text: "Well spread across 3 sectors" },
  { tone: "good", text: "2 holdings rated Strong Buy" },
  { tone: "warn", text: "BEXIMCO's fundamentals look weak" },
];

/** Static, illustrative mockup of the portfolio ANALYSIS (grade + sub-scores + insights). */
export default function PortfolioMockup() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Verdict header: grade + value/PL */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-[var(--border)]">
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 shrink-0" style={{ background: "rgba(21,128,61,0.10)", borderColor: "rgba(21,128,61,0.45)", color: "var(--positive)" }}>
          <span className="text-2xl font-black leading-none">B</span>
          <span className="text-[0.5rem] font-bold uppercase tracking-wide">Solid</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[var(--positive)]">Portfolio Verdict</div>
          <p className="text-[0.82rem] leading-snug text-[var(--text)] font-medium">
            Quality holdings, but one weak name and a pricey entry are holding you back.
          </p>
        </div>
      </div>

      {/* Value + P/L */}
      <div className="grid grid-cols-2 gap-3 px-4 sm:px-5 py-3 border-b border-[var(--border)]">
        <div>
          <div className="text-[0.56rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">Current value</div>
          <div className="text-lg font-extrabold tabular-nums text-[var(--text)]">৳64,040</div>
        </div>
        <div>
          <div className="text-[0.56rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total P/L</div>
          <div className="text-lg font-extrabold tabular-nums text-[var(--positive)]">+৳1,340 <span className="text-xs">(+2.1%)</span></div>
        </div>
      </div>

      {/* Sub-scores — the analysis */}
      <div className="grid grid-cols-3 gap-3 px-4 sm:px-5 py-4">
        {SUBSCORES.map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.6rem] font-bold uppercase tracking-wide text-[var(--text)]">{s.label}</span>
              <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>
                {s.value.toFixed(1)}<span className="text-[0.55rem] text-[var(--text-muted)] font-semibold">/10</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(s.value / 10) * 100}%`, background: s.color }} />
            </div>
            <span className="text-[0.56rem] text-[var(--text-muted)] leading-tight">{s.hint}</span>
          </div>
        ))}
      </div>

      {/* Insight bullets */}
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
        {INSIGHTS.map((it) => {
          const good = it.tone === "good";
          const color = good ? "var(--positive)" : "var(--watch)";
          return (
            <div key={it.text} className="flex items-center gap-2 text-[0.8rem] text-[var(--text)]">
              <span className="shrink-0" style={{ color }} aria-hidden="true">{good ? "✓" : "!"}</span>
              <span>{it.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
