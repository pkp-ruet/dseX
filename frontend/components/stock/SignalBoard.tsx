"use client";
import { useState } from "react";
import type { SignalFlags } from "@/lib/api";
import { friendlyFlag, type Bi } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import PremiumMask from "@/components/premium/PremiumMask";
import { T } from "@/components/i18n/T";

interface Props {
  flags: SignalFlags;
}

const INITIAL = 4;

function Column({ title, items, tone }: { title: Bi; items: Bi[]; tone: "good" | "watch" }) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return null;

  const color = tone === "good" ? "var(--positive)" : "var(--negative)";
  // The first item is free; the rest sit behind the premium mask (screen-only).
  const [first, ...rest] = items;
  const shown = showAll ? rest : rest.slice(0, INITIAL - 1);
  const more = rest.length;

  const row = (item: Bi, i: number) => (
    <li key={i} className="flex items-start gap-2.5">
      <span
        className="shrink-0 flex items-center justify-center rounded-full text-xs font-bold"
        style={{
          width: 20, height: 20,
          color,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
        }}
        aria-hidden="true"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {tone === "good" ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <><path d="M12 5v9" /><path d="M12 18.5h.01" /></>}
        </svg>
      </span>
      <span className="text-sm leading-snug text-text-main">
        <T en={item.en} bn={item.bn} />
      </span>
    </li>
  );

  return (
    <Card padding="none" className="rounded-xl p-5">
      <p className="text-sm font-bold mb-3" style={{ color }}>
        <T en={title.en} bn={title.bn} />
      </p>
      <ul className="space-y-2.5">{row(first, 0)}</ul>
      {more > 0 && (
        <PremiumMask lines={Math.min(more, 3)} className="mt-2.5">
          <ul className="space-y-2.5">{shown.map((item, i) => row(item, i + 1))}</ul>
          {rest.length > INITIAL - 1 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-semibold mt-3 text-primary"
            >
              {showAll ? (
                <T en="Show fewer" bn="কম দেখুন" />
              ) : (
                <T en={`Show all ${items.length}`} bn={`সব ${items.length}টি দেখুন`} />
              )}
            </button>
          )}
        </PremiumMask>
      )}
    </Card>
  );
}

/**
 * Good signs and things to watch (backend services/stock_facts.py), in the
 * stock page's full verdict: the top one of each is free, the rest are Premium.
 */
export default function SignalBoard({ flags }: Props) {
  if (!flags.green.length && !flags.red.length) return null;

  // The backend words every item in both languages (services/stock_facts.py);
  // an older backend only sends the English lists, translated as before.
  const items = flags.items;
  const pick = (tone: "good" | "watch"): Bi[] =>
    items
      ? items.filter((i) => i.tone === tone).map((i) => ({ en: i.en, bn: i.bn }))
      : (tone === "good" ? flags.green : flags.red).map(friendlyFlag);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Column title={{ en: "Good signs", bn: "ভালো দিক" }} items={pick("good")} tone="good" />
      <Column title={{ en: "Things to watch", bn: "সতর্ক থাকার দিক" }} items={pick("watch")} tone="watch" />
    </div>
  );
}
