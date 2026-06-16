import DseTodayNewsCard from "./DseTodayNewsCard";
import type { DseTodayNewsItem } from "@/lib/api";

export default function DseTodayNews({ items }: { items: DseTodayNewsItem[] }) {
  if (!items || items.length === 0) {
    return (
      <section className="mb-6">
        <div className="section-rule-modern">
          <span className="section-rule-text">Today&apos;s News</span>
        </div>
        <div className="ms-card">
          <p className="ms-empty">No news was published on the latest trading day.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="section-rule-modern">
        <span className="section-rule-text">
          Today&apos;s News — {items.length} {items.length === 1 ? "story" : "stories"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((n, i) => (
          <DseTodayNewsCard key={`${n.trading_code}-${n.post_date ?? i}-${i}`} item={n} />
        ))}
      </div>
    </section>
  );
}
