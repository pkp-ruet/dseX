"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { Locked } from "@/components/premium/AnswerLock";
import { OpenScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";

export interface RoomPanel {
  key: string;
  label: { en: string; bn: string };
  /** Anchor ids inside this panel — a link to one opens the panel. */
  anchors: string[];
  body: ReactNode;
  /** What we say, not a raw number (the written analysis): its tab shows only
   *  to a reader with the full report; the body stays in the HTML, hidden. */
  premium?: boolean;
}

/**
 * The data room (2026-10-28): every raw number on the page — accounts,
 * dividends, price and peers, ownership, company facts, news — in tabs
 * instead of three folded chapters. Every panel stays in the HTML (search
 * engines read it); only the active one shows. A `#hash` inside a panel
 * (pushes link to `#ownership`, `#news`, `#dividends` …) opens it.
 *
 * Free for every reader (2026-11-01: a free reader sees the price and the raw
 * numbers here; everything we say is Premium). A `premium` panel's tab shows
 * only when the report is open.
 */
export default function DataRoom({ panels }: { panels: RoomPanel[] }) {
  const { bn } = useLang();
  const open = usePremiumOpen();
  const shown = useMemo(() => (open ? panels : panels.filter((p) => !p.premium)), [open, panels]);
  const [active, setActive] = useState(panels[0]?.key ?? "");

  useEffect(() => {
    const pick = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      const hit = shown.find((p) => p.key === id || p.anchors.includes(id));
      if (hit) {
        setActive(hit.key);
        // Scroll after the panel shows (it was display:none a moment ago).
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
      }
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [shown]);

  if (!panels.length) return null;
  return (
    <section id="ch-data" className="stock-anchor stock-chapter mb-10" aria-labelledby="ch-data-t">
      {/* Same header as the report's parts (StockChapter): one look for every chapter. */}
      <SectionHeader
        id="ch-data-t"
        size="lg"
        className="mb-5"
        title={<T en="The data room" bn="তথ্যের ঘর" />}
        lead={
          <T
            en="Every number on this company, straight from DSE and its accounts. All free."
            bn="এই কোম্পানির সব সংখ্যা, সরাসরি ডিএসই আর এর হিসাব থেকে। সবই ফ্রি।"
          />
        }
      />
      <Tabs
        idBase="room"
        ariaLabel={bn ? "তথ্যের ঘর" : "The data room"}
        value={active}
        onChange={setActive}
        tabs={shown.map((p) => ({ key: p.key, label: <T en={p.label.en} bn={p.label.bn} /> }))}
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
          {p.premium ? (
            <Locked>
              <OpenScope>{p.body}</OpenScope>
            </Locked>
          ) : (
            p.body
          )}
        </div>
      ))}
    </section>
  );
}
