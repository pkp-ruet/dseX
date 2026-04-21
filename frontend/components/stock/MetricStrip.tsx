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

  const fins = financials as Record<string, number | null>[];
  const latestEps = fins.length ? (fins[fins.length - 1]?.eps ?? null) : null;
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

  const divYield = score_row?.div_yield_pct as number | null;
  const divHealth = divYield != null ? (divYield >= 4 ? "good" : divYield >= 2 ? "neutral" : "bad") : "neutral";

  const epsYoy = score_row?.eps_yoy_pct as number | null;
  const epsHealth = epsYoy != null ? (epsYoy > 10 ? "good" : epsYoy >= 0 ? "neutral" : "bad") : "neutral";

  const latestExt = extended_financials.length
    ? extended_financials[extended_financials.length - 1] as Record<string, unknown>
    : null;
  const np = latestExt ? toNum(latestExt.net_profit) : null;
  const eq = latestExt ? toNum(latestExt.total_equity) : null;
  const roe = np != null && eq && eq > 0 ? (np / eq) * 100 : null;
  const roeHealth = roe != null ? (roe >= 15 ? "good" : roe >= 8 ? "neutral" : "bad") : "neutral";

  const mcap = score_row?.mcap_mn as number | null;

  const debt = latestExt ? toNum(latestExt.total_debt) : null;
  const de = debt != null && eq && eq > 0 ? debt / eq : null;
  const deHealth = de != null ? (de < 0.5 ? "good" : de < 1.0 ? "neutral" : "bad") : "neutral";

  // Fixed vivid color per metric (used when health is neutral)
  const METRIC_COLORS = ["#38BDF8", "#4ADE80", "#FB923C", "#FB923C", "#818CF8", "#F472B6"];

  const metrics = [
    {
      label: "P/E Ratio",
      value: peNow ? peNow.toFixed(1) + "x" : "--",
      sub: avgPe5yr ? `vs ${avgPe5yr.toFixed(1)}x avg` : null,
      tag: peContext,
      health: peHealth,
    },
    {
      label: "Div Yield",
      value: divYield != null ? pct(divYield) : "--",
      sub: null,
      tag: null,
      health: divHealth,
    },
    {
      label: "EPS YoY",
      value: epsYoy != null ? signed(epsYoy, 1) + "%" : "--",
      sub: null,
      tag: epsYoy != null ? (epsYoy > 0 ? "▲ Growing" : epsYoy < 0 ? "▼ Declining" : "— Flat") : null,
      health: epsHealth,
    },
    {
      label: "ROE",
      value: roe != null ? pct(roe) : "--",
      sub: null,
      tag: null,
      health: roeHealth,
    },
    {
      label: "Market Cap",
      value: mcap ? millions(mcap) : "--",
      sub: null,
      tag: null,
      health: "neutral" as const,
    },
    {
      label: "Debt/Equity",
      value: de != null ? de.toFixed(2) : "--",
      sub: null,
      tag: de != null ? (de < 0.5 ? "LOW" : de < 1.0 ? "MOD" : "HIGH") : null,
      health: deHealth,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
      {metrics.map((m, idx) => {
        const healthC = healthAccent(m.health);
        const accent = m.health === "neutral" ? METRIC_COLORS[idx] : healthC;
        return (
          <div
            key={m.label}
            className="relative rounded-xl overflow-hidden p-3.5"
            style={{
              background: `linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)`,
              border: `1px solid ${accent}35`,
              boxShadow: `0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 ${accent}15`,
            }}
          >
            {/* Color accent line at top */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)` }}
            />

            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#94A3B8" }}>
              {m.label}
            </p>

            <p
              className="text-2xl font-black tabular-nums leading-none mb-1"
              style={{ color: accent }}
            >
              {m.value}
            </p>

            {m.sub && (
              <p className="text-[10px] mt-1" style={{ color: "#94A3B8" }}>{m.sub}</p>
            )}

            {m.tag && (
              <span
                className="inline-block text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full"
                style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}35` }}
              >
                {m.tag}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function healthAccent(health: string): string {
  if (health === "good") return "#34D399";
  if (health === "bad") return "#F87171";
  return "#64748B";
}
