const ANSWERS = ["Long-term", "Strong fundamentals", "Dividends"];

const MATCHES = [
  { medal: "🥇", code: "GP", name: "Grameenphone", match: 94, color: "#D97706" },
  { medal: "🥈", code: "SQURPHARMA", name: "Square Pharma", match: 88, color: "#64748B" },
  { medal: "🥉", code: "BATBC", name: "British American Tobacco", match: 81, color: "#B45309" },
];

/** Static, illustrative mockup of the recommendation result — answers in, 3 matched stocks out. */
export default function RecommendationMockup() {
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">🎯 Your matches</span>
        <span className="text-[0.62rem] text-[var(--text-muted)]">3 picks for you</span>
      </div>

      {/* Answers recap */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {ANSWERS.map((a) => (
          <span
            key={a}
            className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold"
            style={{ background: "color-mix(in srgb, var(--np-cautious) 12%, transparent)", color: "var(--np-cautious)" }}
          >
            {a}
          </span>
        ))}
      </div>

      <div className="divide-y divide-[var(--cell-rule)] mt-1">
        {MATCHES.map((m) => (
          <div key={m.code} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-base leading-none" aria-hidden="true">{m.medal}</span>
            <span className="min-w-0 flex-1">
              <span className="ticker-tag ticker-tag--static text-[0.8rem]">{m.code}</span>
              <span className="block text-[0.66rem] text-[var(--text-muted)] truncate">{m.name}</span>
            </span>
            <span className="w-20 shrink-0">
              <span className="flex items-center justify-between text-[0.56rem] font-semibold mb-0.5">
                <span className="text-[var(--text-muted)]">match</span>
                <span style={{ color: m.color }}>{m.match}%</span>
              </span>
              <span className="block h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${m.match}%`, background: `linear-gradient(90deg, ${m.color}, color-mix(in srgb, ${m.color} 65%, #fff))` }}
                />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
