/** Pillar copy aligned with views/home.py (how_we_score_html) */
const PILLARS = [
  {
    label: "EPS & Profitability",
    desc: "Is the company consistently earning? Looks at EPS growth track record, earnings history across 5 years, and return on equity.",
  },
  {
    label: "Financial Health",
    desc: "Is the balance sheet solid? Checks debt levels, whether operations generate real cash, and available liquidity.",
  },
  {
    label: "Competitive Strength",
    desc: "Does it hold its ground? Measures profit margins, revenue stability year-over-year, and scale within its sector.",
  },
  {
    label: "Valuation",
    desc: "Is the price reasonable? Compares current P/E and P/B against the company's own 5-year historical averages.",
  },
  {
    label: "Dividend Quality",
    desc: "Does it reward shareholders? Tracks dividend growth, how consistently it pays, and the current yield.",
  },
];

export default function HowWeScoreBox() {
  return (
    <div className="how-we-score-modern">
      <div className="hws-title-modern">How We Score</div>
      <p className="text-[0.78rem] text-[var(--ink-muted)] mb-4 leading-relaxed">
        The dseX DSEF Score (0–100) is a fundamentals-based ranking built on five pillars. Insurance companies are
        excluded. Missing data scores as 0.
      </p>
      <div>
        {PILLARS.map((p) => (
          <div key={p.label} className="hws-row-modern">
            <div className="hws-label-modern">{p.label}</div>
            <div className="hws-desc-modern">{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
