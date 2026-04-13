"use client";
import { useState } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import NewsCard from "./NewsCard";

interface Props {
  news: { title: string; post_date: string; body: string }[];
}

const INITIAL_COUNT = 5;

export default function NewsSection({ news }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!news.length) return null;

  const visible = showAll ? news : news.slice(0, INITIAL_COUNT);
  const hasMore = news.length > INITIAL_COUNT;

  return (
    <div className="mb-4">
      <div className="space-y-2">
        {visible.map((item, i) => (
          <NewsCard
            key={i}
            title={item.title}
            body={item.body}
            postDate={item.post_date}
          />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Show all {news.length} news items
        </button>
      )}
    </div>
  );
}
