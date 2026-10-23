"use client";
import { useState } from "react";
import type { SignalFlags } from "@/lib/api";
import { friendlyFlag } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";
import { useStockLang } from "@/context/StockLangContext";
import PremiumGate from "@/components/premium/PremiumGate";

interface Props {
  flags: SignalFlags;
}

const INITIAL = 4;

function Column({
  title, items, tone, isBn,
}: {
  title: string;
  items: string[];
  tone: "good" | "watch";
  isBn: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return null;

  const color = tone === "good" ? "var(--positive)" : "var(--negative)";
  // The first item is free; the rest sit behind the premium lock (screen-only).
  const [first, ...rest] = items;
  const shown = showAll ? rest : rest.slice(0, INITIAL - 1);
  const more = rest.length;
  const moreLabel = isBn
    ? `আরও ${more}টি ${tone === "good" ? "ভালো লক্ষণ" : "সতর্কতা"}`
    : `${more} more ${tone === "good" ? (more === 1 ? "good sign" : "good signs") : (more === 1 ? "watch-out" : "watch-outs")}`;

  const row = (raw: string, i: number) => (
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
      <span
        className={`text-sm leading-snug ${isBn ? "font-bn" : ""}`}
        lang={isBn ? "bn" : undefined}
        style={{ color: "var(--text)" }}
      >
        {raw}
      </span>
    </li>
  );

  return (
    <Card padding="none" className="rounded-xl p-5">
      <p className={`text-sm font-bold mb-3 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined} style={{ color }}>
        {title}
      </p>
      <ul className="space-y-2.5">{row(first, 0)}</ul>
      {more > 0 && (
        <PremiumGate label={moreLabel} peek={44} compact className="mt-2.5">
          <ul className="space-y-2.5">{shown.map((raw, i) => row(raw, i + 1))}</ul>
          {rest.length > INITIAL - 1 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-semibold mt-3 text-primary"
            >
              {isBn ? (showAll ? "কম দেখুন" : `সবগুলো দেখুন (${items.length})`) : (showAll ? "Show less" : `Show all ${items.length}`)}
            </button>
          )}
        </PremiumGate>
      )}
    </Card>
  );
}

export default function SignalBoard({ flags }: Props) {
  const { lang } = useStockLang();
  const isBn = lang === "bn";
  if (!flags.green.length && !flags.red.length) return null;

  // The backend words every item in both languages (services/stock_facts.py);
  // an older backend only sends the English lists, translated as before.
  const items = flags.items;
  const pick = (tone: "good" | "watch") =>
    items
      ? items.filter((i) => i.tone === tone).map((i) => (isBn ? i.bn : i.en))
      : (tone === "good" ? flags.green : flags.red).map(friendlyFlag);

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
        <Column title={isBn ? "ভালো লক্ষণ" : "Good signs"} items={pick("good")} tone="good" isBn={isBn} />
        <Column title={isBn ? "সতর্ক থাকার দিক" : "Watch-outs"} items={pick("watch")} tone="watch" isBn={isBn} />
      </div>
    </section>
  );
}
