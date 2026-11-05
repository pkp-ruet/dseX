"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { Pair } from "@/components/dividend-calendar/dates";
import IncomeCard, {
  incomeByMonth, useMainQty, type IncomeForecast, type IncomeRecord,
} from "@/components/dividend-calendar/IncomeCard";

export interface CalendarPanel {
  /** Also the panel's id, so the old section anchors (#agms …) still open it. */
  key: string;
  label: Pair;
  /** A shorter label for phones, where all four tabs share one row. */
  short?: Pair;
  count: number;
  body: ReactNode;
}

/** What the "Your dividends" tab is built from (slim rows, sent from the page). */
export interface YoursInput {
  records: IncomeRecord[];
  forecast: IncomeForecast[];
  today: string;
}

/**
 * The calendar's lists in tabs (2026-10-29 compact redesign; since 2026-11-05:
 * record dates · coming next · just declared · AGMs, then "Your dividends"
 * for a signed-in reader with shares — added after mount from their main
 * portfolio, so the server render never carries it). They used to be four sections one
 * under another, so everything below the record dates sat past a very long
 * scroll. Every panel stays in the HTML (search engines read it); only the
 * active one shows. The tab row sticks under the navbar, and a `#hash` naming
 * a panel opens it.
 * The row is a boxed segmented bar (2026-10-29, user: "hard to find the
 * tabs"): every tab in view at once, the count leading on phones, the chosen
 * list filled clay.
 */
export default function CalendarTabs({ panels: base, yours }: { panels: CalendarPanel[]; yours?: YoursInput }) {
  const { bn } = useLang();
  const qty = useMainQty();
  const panels = useMemo(() => {
    if (!yours || !qty || qty.size === 0) return base;
    const months = incomeByMonth(qty, yours.records, yours.forecast, yours.today);
    const shares = new Set(months.flatMap((m) => m.lines.map((l) => l.code.toUpperCase()))).size;
    return [
      ...base,
      {
        key: "your-dividends",
        label: { en: "Your dividends", bn: "আপনার ডিভিডেন্ড" },
        short: { en: "Yours", bn: "আপনার" },
        count: shares,
        body: <IncomeCard months={months} />,
      },
    ];
  }, [base, yours, qty]);
  const [active, setActive] = useState(panels[0]?.key ?? "");
  const top = useRef<HTMLElement>(null);
  // The hash already acted on, so the "Your dividends" tab arriving after
  // mount doesn't scroll the page a second time.
  const handled = useRef("");

  useEffect(() => {
    const pick = (e?: Event) => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!panels.some((p) => p.key === id)) return;
      if (!e && handled.current === id) return;
      handled.current = id;
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
