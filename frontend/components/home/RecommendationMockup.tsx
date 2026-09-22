import StockRow, { StockPill, StockRank, StockRowValue } from "@/components/ui/StockRow";

const ANSWERS = ["Long-term", "Strong fundamentals", "Dividends"];

const MATCHES = [
  { code: "GP", name: "Grameenphone", match: 94, color: "var(--gold)" },
  { code: "SQURPHARMA", name: "Square Pharma", match: 88, color: "var(--text-muted)" },
  { code: "BATBC", name: "British American Tobacco", match: 81, color: "var(--watch)" },
];

/** Static, illustrative mockup of the recommendation result — answers in, 3 matched stocks out. */
export default function RecommendationMockup() {
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-main">Your matches</span>
        <span className="text-xs text-text-muted">3 picks for you</span>
      </div>

      {/* Answers recap */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {ANSWERS.map((a) => (
          <StockPill key={a} tone="watch">
            {a}
          </StockPill>
        ))}
      </div>

      <div className="mt-1 divide-y divide-cell-rule">
        {MATCHES.map((m, i) => (
          <StockRow
            key={m.code}
            as="div"
            href={null}
            code={m.code}
            name={m.name}
            leading={<StockRank n={i + 1} accent={m.color} solid />}
            right={
              <span className="block w-20">
                <StockRowValue value={`${m.match}%`} sub="match" tone="primary" />
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${m.match}%`,
                      background: `linear-gradient(90deg, ${m.color}, color-mix(in srgb, ${m.color} 65%, var(--surface)))`,
                    }}
                  />
                </span>
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}
