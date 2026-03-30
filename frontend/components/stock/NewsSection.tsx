import SectionLabel from "@/components/ui/SectionLabel";
import { formatDate } from "@/lib/formatters";

interface Props {
  news: { title: string; post_date: string; body: string }[];
}

export default function NewsSection({ news }: Props) {
  if (!news.length) return null;

  return (
    <div className="mb-4">
      <SectionLabel>News Feed</SectionLabel>
      <div className="space-y-2 mt-2">
        {news.map((item, i) => (
          <details key={i} className="rounded-[var(--radius)] border border-[var(--border)] bg-white">
            <summary className="flex items-center justify-between cursor-pointer p-3 list-none">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">
                {formatDate(item.post_date)}
              </span>
            </summary>
            {item.body && (
              <div className="px-3 pb-3 text-xs font-mono text-[var(--text-muted)] whitespace-pre-wrap border-t border-[var(--border)] pt-2">
                {item.body}
              </div>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}
