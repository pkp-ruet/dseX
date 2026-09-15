"use client";

import { useState } from "react";
import Link from "next/link";
import type { DailyTip } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { TIP_KIND } from "@/lib/home-ideas";
import { t } from "@/lib/home-copy";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconBulb } from "@/components/home/personalized/DashIcons";

const INITIAL = 5;

const KIND_COLOR: Record<string, string> = {
  kindPaysCash: "var(--watch)",
  kindGrowing: "var(--positive)",
  kindSteady: "var(--primary)",
  kindCheap: "var(--primary)",
  kindNearLow: "var(--accent)",
  kindStrong: "var(--tier-excellent)",
  kindTip: "var(--text-muted)",
};

function summary(tip: DailyTip): string {
  const s = tip.text || "";
  const i = s.indexOf(" — ");
  return i >= 0 ? s.slice(i + 3) : s;
}

/**
 * Every tip of the day (the daily-tips feed, ~10 rows) as a plain list:
 * company name, a kind word, one sentence, the one number behind it. Five
 * show; "Show all" opens the rest.
 */
export default function TipsCard({
  tips,
  held,
  watched,
  lang = "en",
}: {
  tips: DailyTip[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  if (tips.length === 0) return null;
  const shown = open ? tips : tips.slice(0, INITIAL);
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "tipsTitle")} chips={<HeaderChip>{tips.length}</HeaderChip>} href="/daily-tips" linkLabel={t(lang, "allTips")} />
      <ul className="divide-y divide-[var(--cell-rule)]">
        {shown.map((tip) => {
          const kind = TIP_KIND[tip.category] ?? "kindTip";
          const color = KIND_COLOR[kind] ?? "var(--primary)";
          const line = bn ? tip.why_bn || summary(tip) : summary(tip);
          const metric = tip.facts?.[0]?.value;
          return (
            <li key={`${tip.category}-${tip.trading_code}`}>
              <Link
                prefetch={false}
                href={`/stock/${tip.trading_code}`}
                className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }} aria-hidden>
                  <IconBulb size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">{tip.company_name ?? tip.trading_code}</span>
                    <span className="shrink-0 font-mono text-[0.68rem] font-bold tracking-wide text-[var(--text-muted)]">{tip.trading_code}</span>
                    <OwnerMark code={tip.trading_code} held={held} watched={watched} lang={lang} />
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] font-extrabold uppercase tracking-[0.06em]" style={{ color }}>
                    {t(lang, kind)}
                  </span>
                  {line && <span className="mt-0.5 block text-[0.78rem] leading-snug text-[var(--text-muted)] line-clamp-2">{line}</span>}
                </span>
                {metric && (
                  <span className="shrink-0 rounded-md px-2 py-1 text-[0.75rem] font-bold tabular-nums nums" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
                    {metric}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {tips.length > INITIAL && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block w-full border-t border-[var(--border)] px-4 py-2.5 text-center text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
        >
          {open ? t(lang, "showFewer") : t(lang, "showAll", { n: tips.length })}
        </button>
      )}
    </section>
  );
}
