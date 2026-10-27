import PersonalNewsFeed from "@/components/news/PersonalNewsFeed";
import type { DseTodayNewsItem } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";

export default function DseTodayNews({ items }: { items: DseTodayNewsItem[] }) {
  if (!items || items.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader title={<T en="Today's news" bn="আজকের খবর" />} className="mt-8" />
        <div className="ms-card">
          <p className="ms-empty">
            <T en="No news was published on the last trading day." bn="শেষ লেনদেনের দিনে কোনো খবর প্রকাশিত হয়নি।" />
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <SectionHeader
        title={
          <T
            en={`Today's news · ${items.length} ${items.length === 1 ? "story" : "stories"}`}
            bn={`আজকের খবর · ${items.length}টি`}
          />
        }
        className="mt-8"
      />

      <PersonalNewsFeed items={items} />
    </section>
  );
}
