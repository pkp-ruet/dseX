"use client";

import { useEffect, useState, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { PfChapterHead } from "../PfCard";

export interface MoneyPanel {
  key: string;
  label: { en: string; bn: string };
  /** Anchor ids inside this panel — a link to one opens the panel. */
  anchors?: string[];
  body: ReactNode;
}

/**
 * "Your money in detail" (`#ch-money`, 2026-10-30) — the portfolio's data
 * room: the money cards that used to stand between the hero and the analysis
 * (value over time, what moved it, where it sits, money made, dividends, the
 * history log, news) as tabs, all free. Every panel stays mounted; a `#hash`
 * inside one opens it. The stock page's `DataRoom`, for your money.
 */
export default function PfMoneyRoom({ panels }: { panels: MoneyPanel[] }) {
  const { bn } = useLang();
  const [active, setActive] = useState(panels[0]?.key ?? "");

  useEffect(() => {
    const pick = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      const hit = panels.find((p) => p.key === id || (p.anchors ?? []).includes(id));
      if (hit) {
        setActive(hit.key);
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
      }
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [panels]);

  if (!panels.length) return null;
  return (
    <section id="ch-money" className="dash-section pf-chapter" aria-labelledby="ch-money-h">
      <PfChapterHead
        id="ch-money-h"
        title={<T en="Your money in detail" bn="আপনার টাকার বিস্তারিত" />}
        lead={<T en="Every figure behind the page. All free." bn="এই পেজের পেছনের সব সংখ্যা। সবই ফ্রি।" />}
      />
      <Tabs
        idBase="pfroom"
        ariaLabel={bn ? "আপনার টাকার বিস্তারিত" : "Your money in detail"}
        value={active}
        onChange={setActive}
        tabs={panels.map((p) => ({ key: p.key, label: <T en={p.label.en} bn={p.label.bn} /> }))}
      />
      {panels.map((p) => (
        <div
          key={p.key}
          id={`pfroom-panel-${p.key}`}
          role="tabpanel"
          aria-labelledby={`pfroom-${p.key}`}
          className="rp-room-panel flex flex-col gap-4"
          data-active={p.key === active ? "true" : "false"}
        >
          {p.body}
        </div>
      ))}
    </section>
  );
}
