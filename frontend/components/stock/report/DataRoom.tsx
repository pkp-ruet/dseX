"use client";

import { useEffect, useState, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

export interface RoomPanel {
  key: string;
  label: { en: string; bn: string };
  /** Anchor ids inside this panel — a link to one opens the panel. */
  anchors: string[];
  body: ReactNode;
}

/**
 * The data room (2026-10-28): every raw number on the page — accounts,
 * dividends, price and peers, ownership, company facts, news — in tabs
 * instead of three folded chapters. Every panel stays in the HTML (search
 * engines read it); only the active one shows. A `#hash` inside a panel
 * (pushes link to `#ownership`, `#news`, `#dividends` …) opens it.
 */
export default function DataRoom({ panels }: { panels: RoomPanel[] }) {
  const { bn } = useLang();
  const [active, setActive] = useState(panels[0]?.key ?? "");

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
  return (
    <section id="ch-data" className="stock-anchor mb-10" aria-labelledby="ch-data-t">
      <h2 id="ch-data-t" className="text-xl font-bold text-text-main sm:text-2xl">
        <T en="The data room" bn="তথ্যের ঘর" />
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        <T
          en="Every number behind the report, straight from DSE and the company's accounts. All free."
          bn="রিপোর্টের পেছনের সব সংখ্যা, সরাসরি ডিএসই আর কোম্পানির হিসাব থেকে। সবই ফ্রি।"
        />
      </p>
      <Tabs
        className="mt-4"
        idBase="room"
        ariaLabel={bn ? "তথ্যের ঘর" : "The data room"}
        value={active}
        onChange={setActive}
        tabs={panels.map((p) => ({ key: p.key, label: <T en={p.label.en} bn={p.label.bn} /> }))}
      />
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
