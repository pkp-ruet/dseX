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

  const peContext =
    peNow && avgPe5yr
      ? peNow / avgPe5yr < 0.85 ? "CHEAP" : peNow / avgPe5yr > 1.15 ? "EXPENSIVE" : "FAIR"
      : null;
  const peContextColor =
    peContext === "CHEAP" ? "#34D399" :
    peContext === "EXPENSIVE" ? "#F87171" :
    "#94A3B8";

  const metrics = [
    { label: "Current P/E", value: peNow ? peNow.toFixed(1) + "x" : "--", color: undefined },
    { label: "5yr Avg P/E", value: avgPe5yr ? avgPe5yr.toFixed(1) + "x" : "--", color: undefined },
    { label: "Price/Book", value: pbNow ? pbNow.toFixed(2) + "x" : "--", color: undefined },
    { label: "Market Cap", value: mcap ? millions(mcap) : "--", color: undefined },
    ...(latest_price.w52_high ? [{ label: "52W High", value: taka(latest_price.w52_high), color: "#34D399" }] : []),
    ...(latest_price.w52_low  ? [{ label: "52W Low",  value: taka(latest_price.w52_low),  color: "#F87171" }] : []),
    ...(shares ? [{ label: "Total Shares", value: shares >= 1e6 ? `${(shares / 1e6).toFixed(1)}M` : shares.toString(), color: undefined }] : []),
    ...(latestEps != null ? [{ label: "Latest EPS", value: `৳${latestEps.toFixed(2)}`, color: undefined }] : []),
  ];

  return (
    <div
      className="rounded-xl p-4 sm:p-5 mb-5"
      style={{
        background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
        border: "1px solid #1E3A5F",
      }}
    >
      <SectionLabel>Valuation Metrics</SectionLabel>

      {peNow && avgPe5yr && peContext && (
        <div
          className="flex items-center gap-3 mt-3 mb-4 px-4 py-3 rounded-xl"
          style={{ background: `${peContextColor}10`, border: `1px solid ${peContextColor}25` }}
        >
          <span className="text-2xl font-black tabular-nums" style={{ color: peContextColor }}>
            {peContext}
          </span>
          <p className="text-sm" style={{ color: "#CBD5E1" }}>
            Trading at <span className="font-bold text-[#E2E8F0]">{peNow.toFixed(1)}x</span> earnings
            {" "}vs <span className="font-bold text-[#F1F5F9]">{avgPe5yr.toFixed(1)}x</span> historical avg
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
        {metrics.map((m) => (
          <MetricBox key={m.label} label={m.label} value={m.value} color={m.color} />
        ))}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="px-3 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#94A3B8" }}>{label}</p>
      <p className="text-xl font-black tabular-nums leading-none" style={{ color: color ?? "#38BDF8" }}>{value}</p>
    </div>
  );
}
