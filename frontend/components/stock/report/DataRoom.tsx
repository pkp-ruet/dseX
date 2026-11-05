"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { IconBriefcase, IconChartBars, IconCoin, IconGrid, IconNews, IconTrendUp } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

export interface RoomPanel {
  key: string;
  label: { en: string; bn: string };
  /** Anchor ids inside this panel — a link to one opens the panel. */
  anchors: string[];
  body: ReactNode;
}

/** One icon a tab, so the row reads as tabs at a glance. */
const ICONS: Record<string, ReactNode> = {
  profit: <IconChartBars size={20} />,
  dividends: <IconCoin size={20} />,
  price: <IconTrendUp size={20} />,
  ownership: <IconGrid size={20} />,
  company: <IconBriefcase size={20} />,
  news: <IconNews size={20} />,
};

/**
 * The data room (2026-10-28): every raw number on the page — accounts,
 * dividends, price and peers, ownership, company facts, news — in tabs.
 * Every panel stays in the HTML (search engines read it); only the active one
 * shows. A `#hash` inside a panel (pushes link to `#ownership`, `#news`,
 * `#dividends` …) opens it. Free for every reader.
 *
 * 2026-11-05 (user: "remove written analysis tab from data room and make the
 * tabs look more visible"): the written analysis tab is gone, and the tabs
 * are a boxed bar like the portfolio's money tabs — an icon over each label,
 * three a row on phones (two for four tabs), all in one row from 640px, the
 * chosen one filled clay.
 */
export default function DataRoom({ panels }: { panels: RoomPanel[] }) {
  const { bn } = useLang();
  const [active, setActive] = useState(panels[0]?.key ?? "");
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pick = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      const hit = panels.find((p) => p.key === id || p.anchors.includes(id));
      if (hit) {
        setActive(hit.key);
        // Scroll after the panel shows (it was display:none a moment ago).
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
      }
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [panels]);

  if (!panels.length) return null;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = panels.findIndex((p) => p.key === active);
    const next = panels[(i + (e.key === "ArrowRight" ? 1 : panels.length - 1)) % panels.length];
    setActive(next.key);
    bar.current?.querySelector<HTMLButtonElement>(`#room-${CSS.escape(next.key)}`)?.focus();
    e.preventDefault();
  };

  const n = panels.length;
  const phoneCols = n === 4 ? 2 : Math.min(3, n);

  return (
    <section id="ch-data" className="stock-anchor stock-chapter mb-10" aria-labelledby="ch-data-t">
      <SectionHeader
        id="ch-data-t"
        size="lg"
        className="mb-5"
        title={<T en="The data room" bn="তথ্যের ঘর" />}
        lead={
          <T
            en="Every number on this company, straight from DSE and its accounts. All free. Tap a tab to see it."
            bn="এই কোম্পানির সব সংখ্যা, সরাসরি ডিএসই আর এর হিসাব থেকে। সবই ফ্রি। দেখতে একটি ট্যাবে চাপুন।"
          />
        }
      />
      <div
        ref={bar}
        role="tablist"
        aria-label={bn ? "তথ্যের ঘর" : "The data room"}
        onKeyDown={onKey}
        className="room-bar"
        style={{ "--cols": n, "--phone-cols": phoneCols } as CSSProperties}
      >
        {panels.map((p) => {
          const on = p.key === active;
          return (
            <button
              key={p.key}
              id={`room-${p.key}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`room-panel-${p.key}`}
              tabIndex={on ? 0 : -1}
              data-on={on ? "true" : undefined}
              onClick={() => setActive(p.key)}
              className="room-tab"
            >
              <span className="room-icon" aria-hidden="true">{ICONS[p.key]}</span>
              <T en={p.label.en} bn={p.label.bn} />
            </button>
          );
        })}
      </div>
      {panels.map((p) => (
        <div
          key={p.key}
          id={`room-panel-${p.key}`}
          role="tabpanel"
          aria-labelledby={`room-${p.key}`}
          className="rp-room-panel mt-5"
          data-active={p.key === active ? "true" : "false"}
        >
          {p.body}
        </div>
      ))}
    </section>
  );
}
