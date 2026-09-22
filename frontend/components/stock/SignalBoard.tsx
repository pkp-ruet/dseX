"use client";
import { useState } from "react";
import type { SignalFlags } from "@/lib/api";
import { friendlyFlag } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";

interface Props {
  flags: SignalFlags;
}

const INITIAL = 4;

function Column({
  title, items, tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "watch";
}) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return null;

  const color = tone === "good" ? "var(--positive)" : "var(--negative)";
  const shown = showAll ? items : items.slice(0, INITIAL);

  return (
    <Card padding="none" className="rounded-xl p-5">
      <p className="text-sm font-bold mb-3" style={{ color }}>
        {title}
      </p>
      <ul className="space-y-2.5">
        {shown.map((raw, i) => (
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
            <span className="text-sm leading-snug" style={{ color: "var(--text)" }}>
              {friendlyFlag(raw)}
            </span>
          </li>
        ))}
      </ul>
      {items.length > INITIAL && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-semibold mt-3"
          style={{ color: "var(--primary)" }}
        >
          {showAll ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </Card>
  );
}

export default function SignalBoard({ flags }: Props) {
  if (!flags.green.length && !flags.red.length) return null;

  return (
    <section id="signals" className="mb-8 stock-anchor">
      <SectionTitle
        title="Signals at a Glance"
        sub={<>
            The good signs and the things to keep an eye on.
        </>}
        bn="ভালো লক্ষণ আর যেগুলোতে নজর রাখা দরকার।"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Column title="Good signs" items={flags.green} tone="good" />
        <Column title="Watch-outs" items={flags.red} tone="watch" />
      </div>
    </section>
  );
}
