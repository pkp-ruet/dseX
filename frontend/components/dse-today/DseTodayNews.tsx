import PersonalNewsFeed from "@/components/news/PersonalNewsFeed";
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

      <PersonalNewsFeed items={items} />
    </section>
  );
}
