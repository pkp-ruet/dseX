import PersonalNewsFeed from "@/components/news/PersonalNewsFeed";
import type { DseTodayNewsItem } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

export default function DseTodayNews({ items }: { items: DseTodayNewsItem[] }) {
  if (!items || items.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader title={<>Today&apos;s news</>} className="mt-8" />
        <div className="ms-card">
          <p className="ms-empty">No news was published on the latest trading day.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <SectionHeader title={<>Today&apos;s news — {items.length} {items.length === 1 ? "story" : "stories"}</>} className="mt-8" />

      <PersonalNewsFeed items={items} />
    </section>
  );
}
