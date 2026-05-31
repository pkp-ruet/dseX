import Link from "next/link";
import NewsCard from "@/components/stock/NewsCard";
import type { DseTodayNewsItem } from "@/lib/api";

export default function DseTodayNews({ items }: { items: DseTodayNewsItem[] }) {
  if (!items || items.length === 0) {
    return (
      <section className="mb-6">
        <div className="section-rule-modern">
          <span className="section-rule-text">Today&apos;s News</span>
        </div>
        <div className="text-sm text-[var(--text-muted)] px-4 py-6 text-center rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          No news published for the latest trading day.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="section-rule-modern">
        <span className="section-rule-text">Today&apos;s News — {items.length} stories</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((n, i) => (
          <div key={`${n.trading_code}-${n.post_date ?? i}-${i}`} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Link
                href={`/stock/${n.trading_code}`}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  background: "rgba(14,165,233,0.1)",
                  color: "var(--primary)",
                  border: "1px solid rgba(14,165,233,0.25)",
                }}
              >
                {n.trading_code}
              </Link>
              {n.company_name && (
                <span className="text-[11px] text-[var(--text-muted)] truncate">{n.company_name}</span>
              )}
            </div>
            <NewsCard
              title={n.title}
              body={n.body ?? ""}
              postDate={n.post_date ?? ""}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
