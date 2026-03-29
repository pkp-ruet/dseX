"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getAudit } from "@/lib/api";
import type { AuditCompanyRow, AuditResponse } from "@/lib/api";
import SectionLabel from "@/components/ui/SectionLabel";

function CoverageCell({ count, threshold = 3 }: { count: number; threshold?: number }) {
  const color =
    count >= threshold
      ? "text-[var(--positive)]"
      : count >= 1
      ? "text-yellow-600"
      : "text-[var(--negative)]";
  return <span className={`font-medium ${color}`}>{count}</span>;
}

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "missing_cf" | "missing_fin" | "complete">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAudit()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const companies = data?.companies ?? [];
  const filtered = companies.filter((c) => {
    const matchSearch =
      !search ||
      c.trading_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.company_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "missing_cf" && c.cf_years === 0) ||
      (filter === "missing_fin" && (c.eps_years < 3 || c.profit_years < 3)) ||
      (filter === "complete" && c.eps_years >= 3 && c.profit_years >= 3 && c.cf_years >= 1);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="mb-4">
        <Link href="/" className="text-xs text-[var(--primary)] hover:underline font-medium">
          ← Back to Rankings
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">Database Coverage</h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Data audit view — inspect scraper coverage and quality.
      </p>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Total Companies" value={data.summary.total} />
          <MetricCard label="Has 3yr Financials" value={data.summary.has_financials} />
          <MetricCard label="Has Cash Flow" value={data.summary.has_cf} />
          <MetricCard label="Missing Price" value={data.summary.missing_price} warn />
        </div>
      )}

      <SectionLabel>Company Coverage</SectionLabel>

      <div className="flex flex-wrap gap-2 mt-2 mb-3">
        <input
          type="text"
          placeholder="Search code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[var(--border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] w-52"
        />
        {(["all", "missing_cf", "missing_fin", "complete"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              filter === f
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]"
            }`}
          >
            {f === "all" ? "All" : f === "missing_cf" ? "Missing CF" : f === "missing_fin" ? "Missing Financials" : "Complete"}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] self-center">{filtered.length} results</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[var(--text-muted)] text-sm">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="text-left py-2 px-2">Code</th>
                <th className="py-2 px-2">EPS</th>
                <th className="py-2 px-2">Profit</th>
                <th className="py-2 px-2">Dividend</th>
                <th className="py-2 px-2">NAV</th>
                <th className="py-2 px-2">Op CF</th>
                <th className="py-2 px-2">EBIT</th>
                <th className="py-2 px-2">Revenue</th>
                <th className="py-2 px-2">News</th>
                <th className="py-2 px-2">Price</th>
                <th className="py-2 px-2">Holding</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <AuditRow key={c.trading_code} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditRow({ c }: { c: AuditCompanyRow }) {
  return (
    <tr className="border-b border-[var(--border)] hover:bg-gray-50">
      <td className="py-1.5 px-2">
        <Link href={`/stock/${c.trading_code}`} className="font-bold text-[var(--primary)] hover:underline">
          {c.trading_code}
        </Link>
        {c.company_name && (
          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">{c.company_name}</div>
        )}
      </td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.eps_years} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.profit_years} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.dividend_years} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.nav_years} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.cf_years} threshold={1} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.ebit_years} threshold={1} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.revenue_years} threshold={1} /></td>
      <td className="py-1.5 px-2 text-center"><CoverageCell count={c.news_count} threshold={1} /></td>
      <td className="py-1.5 px-2 text-center">
        <span className={c.has_price ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
          {c.has_price ? "✓" : "✗"}
        </span>
      </td>
      <td className="py-1.5 px-2 text-center">
        <span className={c.has_shareholding ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
          {c.has_shareholding ? "✓" : "✗"}
        </span>
      </td>
    </tr>
  );
}

function MetricCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3 text-center">
      <div
        className="text-2xl font-bold"
        style={{ color: warn && value > 0 ? "var(--negative)" : "var(--primary)" }}
      >
        {value}
      </div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  );
}
