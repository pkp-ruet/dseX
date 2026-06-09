import type { CompanyDetail } from "@/lib/api";
import { crore } from "@/lib/formatters";

interface Props {
  detail: CompanyDetail;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function KeyNumbers({ detail }: Props) {
  const { profile, latest_price, score_row, financials } = detail;

  // Latest financial year
  const sortedFins = [...financials].sort(
    (a, b) => Number((b as Record<string, unknown>).year ?? 0) - Number((a as Record<string, unknown>).year ?? 0)
  );
  const latestFin = sortedFins[0] as Record<string, unknown> | undefined;

  const eps = toNum(latestFin?.eps) ?? toNum(latestFin?.eps_cont_basic) ?? toNum(latestFin?.eps_basic);

  // Prefer pre-computed P/E from backend; fall back to LTP / EPS
  const peStored = toNum(latestFin?.pe_ratio_cont_basic) ?? toNum(latestFin?.pe_ratio_basic);
  const peComputed = eps != null && eps > 0 && latest_price.ltp != null
    ? latest_price.ltp / eps
    : null;
  const pe = peStored ?? peComputed;

  const divYield = toNum(score_row?.div_yield_pct);
  const reserve = toNum(profile.reserve_surplus_mn);
  const loan = toNum(profile.total_loan_mn);

  const items: { label: string; value: string; desc: string; tone?: string }[] = [
    {
      label: "EPS",
      value: eps != null ? `৳${eps.toFixed(2)}` : "--",
      desc: "Earnings per share (latest year)",
      tone: eps != null && eps < 0 ? "var(--negative)" : undefined,
    },
    {
      label: "P/E Ratio",
      value: pe != null ? pe.toFixed(1) : "--",
      desc: "Price you pay per ৳1 of earnings",
    },
    {
      label: "Dividend Yield",
      value: divYield != null ? `${divYield.toFixed(2)}%` : "--",
      desc: "Annual cash return on the price",
    },
    {
      label: "Reserve & Surplus",
      value: crore(reserve),
      desc: "Company's accumulated savings",
    },
    {
      label: "Total Loan",
      value: crore(loan),
      desc: "Outstanding debt the company carries",
      tone: reserve != null && loan != null && reserve > 0 && loan > 2 * reserve ? "var(--watch)" : undefined,
    },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Key Numbers
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        The raw figures behind the verdict — for the curious.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              {item.label}
            </p>
            <p
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: item.tone ?? "var(--text)" }}
            >
              {item.value}
            </p>
            <p className="text-xs mt-2 leading-snug" style={{ color: "var(--text-muted)" }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
