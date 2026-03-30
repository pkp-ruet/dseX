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

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
      <SectionLabel>Valuation</SectionLabel>
      <div className="space-y-1.5 mt-2">
        <Row label="Current P/E" value={peNow ? peNow.toFixed(1) : "--"} />
        <Row label="5yr Avg P/E" value={avgPe5yr ? avgPe5yr.toFixed(1) : "--"} />
        <Row label="Current P/B" value={pbNow ? pbNow.toFixed(2) : "--"} />
        <Row label="Market Cap" value={mcap ? millions(mcap) : "--"} />
        {latest_price.w52_high && (
          <Row label="52W High" value={taka(latest_price.w52_high)} color="var(--positive)" />
        )}
        {latest_price.w52_low && (
          <Row label="52W Low" value={taka(latest_price.w52_low)} color="var(--negative)" />
        )}
        {shares && (
          <Row label="Total Shares" value={shares >= 1e6 ? `${(shares / 1e6).toFixed(1)}M` : shares.toString()} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-medium" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
