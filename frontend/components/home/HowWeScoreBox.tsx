import SectionLabel from "@/components/ui/SectionLabel";

const PILLARS = [
  { name: "Business Quality", weight: "30%", desc: "EPS consistency, CAGR, ROE, Net Profit Margin trend" },
  { name: "Financial Health", weight: "20%", desc: "Debt-to-Equity, interest coverage, CFO quality, cash ratio" },
  { name: "Competitive Moat", weight: "20%", desc: "Gross margin, revenue volatility, market revenue rank" },
  { name: "Valuation", weight: "15%", desc: "Current P/E vs 5yr average, current P/B vs 5yr average" },
  { name: "Dividend Quality", weight: "15%", desc: "DPS CAGR, dividend consistency, dividend yield" },
];

export default function HowWeScoreBox() {
  return (
    <div className="mt-10">
      <SectionLabel>How We Score</SectionLabel>
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 mt-2">
        <p className="text-xs text-[var(--text-muted)] mb-3">
          The dseX DSEF Score (0–100) is a fundamentals-based ranking built on five pillars.
          Insurance companies are excluded. Missing data scores as 0.
        </p>
        <div className="space-y-2">
          {PILLARS.map((p) => (
            <div key={p.name} className="flex items-start gap-3">
              <span className="text-xs font-bold text-[var(--primary)] w-8 shrink-0">{p.weight}</span>
              <div>
                <span className="text-xs font-semibold">{p.name}</span>
                <span className="text-xs text-[var(--text-muted)]"> — {p.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
