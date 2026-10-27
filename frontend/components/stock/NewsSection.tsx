"use client";
import { useState } from "react";
import NewsCard from "./NewsCard";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/stock/SectionTitle";
import { T } from "@/components/i18n/T";

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
        title={<T en="Latest news" bn="সর্বশেষ খবর" />}
        sub={
          <T
            en="Recent news and announcements from the company, as published on DSE."
            bn="কোম্পানির সাম্প্রতিক খবর ও ঘোষণা, DSE-তে যেভাবে প্রকাশিত হয়েছে। মূল খবর ইংরেজিতে।"
          />
        }
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
          variant="quiet"
          size="sm"
          onClick={() => setShowAll(true)}
          className="mt-4 rounded-full"
        >
          <T en={`Show all ${news.length} news items →`} bn={`সব ${news.length}টি খবর দেখুন →`} />
        </Button>
      )}
    </section>
  );
}
