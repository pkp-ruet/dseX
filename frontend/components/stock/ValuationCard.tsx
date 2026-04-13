import SectionLabel from "@/components/ui/SectionLabel";
import { taka, millions } from "@/lib/formatters";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function ValuationCard({ detail }: Props) {
  const { profile, latest_price, financials, score_row } = detail;
  const fins = financials as Record<string, number | null>[];
  const ltp = latest_price.ltp;

  const latestFin = fins.length ? fins[fins.length - 1] : null;
  const latestEps = latestFin?.eps ?? null;
  const latestNav = latestFin?.nav_per_share ?? null;

  const peNow = ltp && latestEps && latestEps > 0 ? ltp / latestEps : null;
  const pbNow = ltp && latestNav && latestNav > 0 ? ltp / latestNav : null;

  const avgPe5yr = (() => {
    const pes = fins
      .map((r) => r["pe_ratio_cont_basic"] ?? r["pe_ratio_basic"])
      .filter((v): v is number => v != null && v > 0);
    return pes.length >= 2 ? pes.reduce((a, b) => a + b, 0) / pes.length : null;
  })();

  const mcap = score_row?.mcap_mn as number | null;
  const shares = profile.total_shares;

  // Valuation context
  const peContext =
    peNow && avgPe5yr
      ? peNow / avgPe5yr < 0.85
        ? "CHEAP"
        : peNow / avgPe5yr > 1.15
        ? "EXPENSIVE"
        : "FAIR"
      : null;
  const peContextColor =
    peContext === "CHEAP"
      ? "var(--positive)"
      : peContext === "EXPENSIVE"
      ? "var(--negative)"
      : "var(--text-muted)";

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 mb-4">
      <SectionLabel>Valuation Metrics</SectionLabel>

      {/* Summary sentence */}
      {peNow && avgPe5yr && peContext && (
        <p className="text-sm mt-2 mb-3 leading-relaxed">
          Trading at <span className="font-bold">{peNow.toFixed(1)}x</span> earnings
          vs <span className="font-medium">{avgPe5yr.toFixed(1)}x</span> historical average
          {" \u2014 "}
          <span className="font-bold" style={{ color: peContextColor }}>{peContext}</span>
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
        <MetricBox label="Current P/E" value={peNow ? peNow.toFixed(1) : "--"} />
        <MetricBox label="5yr Avg P/E" value={avgPe5yr ? avgPe5yr.toFixed(1) : "--"} />
        <MetricBox label="Current P/B" value={pbNow ? pbNow.toFixed(2) : "--"} />
        <MetricBox label="Market Cap" value={mcap ? millions(mcap) : "--"} />
        {latest_price.w52_high && (
          <MetricBox label="52W High" value={taka(latest_price.w52_high)} color="var(--positive)" />
        )}
        {latest_price.w52_low && (
          <MetricBox label="52W Low" value={taka(latest_price.w52_low)} color="var(--negative)" />
        )}
        {shares && (
          <MetricBox label="Total Shares" value={shares >= 1e6 ? `${(shares / 1e6).toFixed(1)}M` : shares.toString()} />
        )}
        {latestEps != null && (
          <MetricBox label="Latest EPS" value={`৳${latestEps.toFixed(2)}`} />
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-bold" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
