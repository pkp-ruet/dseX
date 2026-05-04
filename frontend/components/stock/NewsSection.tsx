"use client";
import { useState } from "react";
import NewsCard from "./NewsCard";

interface Props {
  news: { title: string; post_date: string; body: string }[];
}

const INITIAL_COUNT = 3;

export default function NewsSection({ news }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!news.length) return null;

  const visible = showAll ? news : news.slice(0, INITIAL_COUNT);
  const hasMore = news.length > INITIAL_COUNT;

  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "#F1F5F9" }}>
        What's New
      </h2>
      <p className="text-sm mb-5" style={{ color: "#CBD5E1" }}>
        Recent news and announcements about this company.
      </p>

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
          className="mt-4 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          style={{
            color: "#38BDF8",
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.25)",
          }}
        >
          Show all {news.length} news items →
        </button>
      )}
    </section>
  );
}
