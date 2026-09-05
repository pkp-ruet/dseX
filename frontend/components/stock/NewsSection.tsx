"use client";
import { useState } from "react";
import NewsCard from "./NewsCard";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/stock/SectionTitle";

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
      <SectionTitle
        title="What's New"
        sub={<>
            Recent news and announcements about this company.
        </>}
        bn="এই কোম্পানির সাম্প্রতিক খবর ও ঘোষণা।"
      />

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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="mt-4 rounded-full"
        >
          Show all {news.length} news items →
        </Button>
      )}
    </section>
  );
}
