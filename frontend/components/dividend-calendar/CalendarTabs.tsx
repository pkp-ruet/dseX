"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { Pair } from "@/components/dividend-calendar/dates";

export interface CalendarPanel {
  /** Also the panel's id, so the old section anchors (#agms …) still open it. */
  key: string;
  label: Pair;
  /** A shorter label for phones, where all four tabs share one row. */
  short?: Pair;
  count: number;
  body: ReactNode;
}

/**
 * The calendar's lists in tabs (2026-10-29 compact redesign): record dates ·
 * AGMs · biggest payers · just declared. They used to be four sections one
 * under another, so everything below the record dates sat past a very long
 * scroll. Every panel stays in the HTML (search engines read it); only the
 * active one shows. The tab row sticks under the navbar, and a `#hash` naming
 * a panel opens it.
 * The row is a boxed segmented bar (2026-10-29, user: "hard to find the
 * tabs"): every tab in view at once, the count leading on phones, the chosen
 * list filled clay.
 */
export default function CalendarTabs({ panels }: { panels: CalendarPanel[] }) {
  const { bn } = useLang();
  const [active, setActive] = useState(panels[0]?.key ?? "");
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    const pick = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!panels.some((p) => p.key === id)) return;
      setActive(id);
      requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start" }));
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [panels]);

  const change = (key: string) => {
    setActive(key);
    // Shareable without a jump: replaceState never scrolls or fires hashchange.
    window.history.replaceState(null, "", `#${key}`);
    // Switching while the row is stuck: start the new list at its top.
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  };

  if (!panels.length) return null;
  return (
    <section ref={top} className="dc-cal" aria-label={bn ? "ডিভিডেন্ড ক্যালেন্ডার" : "Dividend calendar"}>
      {/* --dc-tabs = how many columns the phone bar splits into. */}
      <div className="dc-tabs" style={{ "--dc-tabs": panels.length } as CSSProperties}>
        <Tabs
          idBase="dc"
          ariaLabel={bn ? "ক্যালেন্ডারের তালিকা" : "Calendar lists"}
          value={active}
          onChange={change}
          className="dc-tabrow"
          tabs={panels.map((p) => ({
            key: p.key,
            label: (
              <>
                <span className="dc-tab-l">
                  <span className="dc-tab-long">
                    <T en={p.label.en} bn={p.label.bn} />
                  </span>
                  <span className="dc-tab-short">
                    <T en={(p.short ?? p.label).en} bn={(p.short ?? p.label).bn} />
                  </span>
                </span>
                <span className="dc-tab-n">{p.count}</span>
              </>
            ),
          }))}
        />
      </div>
      {panels.map((p) => (
        <div
          key={p.key}
          id={p.key}
          role="tabpanel"
          aria-labelledby={`dc-${p.key}`}
          className="dc-panel"
          data-active={p.key === active ? "true" : "false"}
        >
          {p.body}
        </div>
      ))}
    </section>
  );
}
