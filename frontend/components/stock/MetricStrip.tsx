import { taka, pct, signed, millions } from "@/lib/formatters";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function MetricStrip({ detail }: Props) {
  const { latest_price, financials, extended_financials, score_row } = detail;
  const ltp = latest_price.ltp;

  // P/E
  const fins = financials as Record<string, number | null>[];
  const latestEps = fins.length
    ? (fins[fins.length - 1]?.eps ?? null)
    : null;
  const peNow = ltp && latestEps && latestEps > 0 ? ltp / latestEps : null;
  const avgPe5yr = (() => {
    const pes = fins
      .map((r) => r["pe_ratio_cont_basic"] ?? r["pe_ratio_basic"])
      .filter((v): v is number => v != null && v > 0);
    return pes.length >= 2 ? pes.reduce((a, b) => a + b, 0) / pes.length : null;
  })();
  const peContext =
    peNow && avgPe5yr
      ? peNow / avgPe5yr < 0.85 ? "CHEAP" : peNow / avgPe5yr > 1.15 ? "EXPENSIVE" : "FAIR"
      : null;
  const peHealth = peContext === "CHEAP" ? "good" : peContext === "EXPENSIVE" ? "bad" : "neutral";

  // Dividend yield
  const divYield = score_row?.div_yield_pct as number | null;
  const divHealth = divYield != null ? (divYield >= 4 ? "good" : divYield >= 2 ? "neutral" : "bad") : "neutral";

  // EPS YoY
  const epsYoy = score_row?.eps_yoy_pct as number | null;
  const epsHealth = epsYoy != null ? (epsYoy > 10 ? "good" : epsYoy >= 0 ? "neutral" : "bad") : "neutral";

  // ROE
  const latestExt = extended_financials.length
    ? extended_financials[extended_financials.length - 1] as Record<string, unknown>
    : null;
  const np = latestExt ? toNum(latestExt.net_profit) : null;
  const eq = latestExt ? toNum(latestExt.total_equity) : null;
  const roe = np != null && eq && eq > 0 ? (np / eq) * 100 : null;
  const roeHealth = roe != null ? (roe >= 15 ? "good" : roe >= 8 ? "neutral" : "bad") : "neutral";

  // Market cap
  const mcap = score_row?.mcap_mn as number | null;

  // D/E
  const debt = latestExt ? toNum(latestExt.total_debt) : null;
  const de = debt != null && eq && eq > 0 ? debt / eq : null;
  const deHealth = de != null ? (de < 0.5 ? "good" : de < 1.0 ? "neutral" : "bad") : "neutral";

  const metrics = [
    {
      label: "P/E Ratio",
      value: peNow ? peNow.toFixed(1) + "x" : "--",
      context: avgPe5yr ? `vs ${avgPe5yr.toFixed(1)}x avg` : null,
      tag: peContext,
      health: peHealth,
    },
    {
      label: "Div Yield",
      value: divYield != null ? pct(divYield) : "--",
      context: null,
      tag: null,
      health: divHealth,
    },
    {
      label: "EPS YoY",
      value: epsYoy != null ? signed(epsYoy, 1) + "%" : "--",
      context: null,
      tag: epsYoy != null ? (epsYoy > 0 ? "\u25B2" : epsYoy < 0 ? "\u25BC" : "\u2014") : null,
      health: epsHealth,
    },
    {
      label: "ROE",
      value: roe != null ? pct(roe) : "--",
      context: null,
      tag: null,
      health: roeHealth,
    },
    {
      label: "Market Cap",
      value: mcap ? millions(mcap) : "--",
      context: null,
      tag: null,
      health: "neutral" as const,
    },
    {
      label: "Debt/Equity",
      value: de != null ? de.toFixed(2) : "--",
      context: null,
      tag: de != null ? (de < 0.5 ? "LOW" : de < 1.0 ? "MOD" : "HIGH") : null,
      health: deHealth,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="metric-card rounded-[var(--radius)] border border-[var(--border)] bg-white p-3"
          style={{ borderTop: `2px solid ${healthColor(m.health)}` }}
        >
          <p className="text-xs text-[var(--text-muted)] font-medium mb-1">{m.label}</p>
          <p className="text-lg font-bold leading-tight">{m.value}</p>
          {m.context && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{m.context}</p>
          )}
          {m.tag && (
            <span
              className="inline-block text-xs font-semibold mt-1 px-1.5 py-0.5 rounded"
              style={{ color: healthColor(m.health), background: hexWithAlpha(healthColor(m.health), 0.1) }}
            >
              {m.tag}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function healthColor(health: string): string {
  if (health === "good") return "#10B981";
  if (health === "bad") return "#EF4444";
  return "#94A3B8"; // neutral slate
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}
