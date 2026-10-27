import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import ColourKey from "@/components/landing/ColourKey";
import Stat from "@/components/ui/Stat";
import type { TrustStats } from "@/lib/api";

/**
 * Block 2 — the credibility signal and the colour key as ONE band
 * (2026-10-24; they were two strips stacked back to back, which read as admin
 * chrome before any real content).
 *
 * Top: the checkable numbers, number first in ink (`ui/Stat`) — colour is for
 * meaning, so the figures don't wear accents. Middle: the colour key, read
 * once so every card below is readable. Bottom: one sentence on where the data
 * comes from. No prose beyond that.
 */

interface Figure {
  key: string;
  value: string;
  label: ReactNode;
}

/** Column count on desktop — written out so Tailwind's JIT can see the class. */
const COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export default function TrustStrip({
  totalCount,
  sectorCount,
  trust,
}: {
  totalCount: number;
  sectorCount: number;
  trust: TrustStats | null;
}) {
  const users = trust?.user_count ?? 0;
  const avg = trust?.review_average ?? null;
  const reviews = trust?.review_count ?? 0;

  // Built as a list so a missing figure (no reviews yet, say) shortens the row
  // instead of leaving a hole in it.
  const figures: Figure[] = [
    { key: "scored", value: `${totalCount}`, label: <T en="Companies scored" bn="কোম্পানির স্কোর" /> },
  ];
  if (sectorCount > 0) {
    figures.push({ key: "sectors", value: `${sectorCount}`, label: <T en="Sectors covered" bn="সেক্টর" /> });
  }
  if (users > 0) {
    figures.push({
      key: "users",
      value: users.toLocaleString("en-US"),
      label: <T en="People signed up" bn="জন অ্যাকাউন্ট খুলেছেন" />,
    });
  }
  if (avg != null && reviews > 0) {
    figures.push({
      key: "rating",
      value: `★ ${avg.toFixed(1)}`,
      label: <T en={`From ${reviews} ratings`} bn={`${reviews}টি রেটিং থেকে`} />,
    });
  }

  return (
    <section aria-label="Coverage, sources and how to read the colours" className="soft-card overflow-hidden">
      {/* The numbers — four across on a desktop, 2×2 on a phone. */}
      <div className={`grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-5 sm:px-6 ${COLS[figures.length] ?? "sm:grid-cols-4"}`}>
        {figures.map((f) => (
          <Stat key={f.key} value={f.value} label={f.label} size="lg" />
        ))}
      </div>

      <div className="border-t border-border px-4 py-4 sm:px-6">
        <ColourKey />
      </div>

      <div className="border-t border-border bg-surface-2 px-4 py-3 sm:px-6">
        <p className="text-sm font-semibold leading-relaxed text-text-main">
          <T
            en="No tips and no rumours. Every figure comes from what companies publish and from each day's market data."
            bn="কোনো টিপস বা গুজব নয়। প্রতিটি হিসাব কোম্পানির প্রকাশিত প্রতিবেদন আর প্রতিদিনের বাজারের তথ্য থেকে নেওয়া।"
          />
        </p>
      </div>
    </section>
  );
}
