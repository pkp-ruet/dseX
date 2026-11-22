"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { IconChartBars, IconCoin, IconGrid, IconList } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { trackEvent } from "@/lib/track";
import { useLang } from "@/context/LangContext";

const ICON: Record<string, ReactNode> = {
  growth: <IconChartBars size={20} />,
  where: <IconGrid size={20} />,
  income: <IconCoin size={20} />,
  activity: <IconList size={20} />,
};

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
 *
 * The tab bar is its own boxed bar since 2026-11-02 (user: "make the Your
 * money in detail tabs more visible so user understands they are tabs"):
 * icon over label, the chosen tab filled clay, the open part right under it.
 *
 * "More details" since 2026-11-23 (the simple portfolio page): four tabs
 * (Growth · Where it sits · Income · Activity, was six), always on screen
 * with Growth open (a closed bar was one tap too many); a `#hash` inside a
 * panel opens its tab.
 */
export default function PfMoneyRoom({ panels }: { panels: MoneyPanel[] }) {
  const { bn } = useLang();
  const [active, setActive] = useState(panels[0]?.key ?? "");
  const bar = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = panels.findIndex((p) => p.key === active);
    const next = panels[(i + (e.key === "ArrowRight" ? 1 : panels.length - 1)) % panels.length];
    setActive(next.key);
    bar.current?.querySelector<HTMLButtonElement>(`#pfroom-${CSS.escape(next.key)}`)?.focus();
    e.preventDefault();
  };

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
    <section id="ch-money" className="dash-section pfm-wrap" aria-label={bn ? "আরও বিস্তারিত" : "More details"}>
      <div className="pfm-head">
        <h2 className="pfh-title">
          <T en="More details" bn="আরও বিস্তারিত" />
        </h2>
        <p className="pfm-head-sub">
          <T en="Every figure behind your page, all free. Tap a tab." bn="আপনার পেজের পেছনের সব সংখ্যা, সবই ফ্রি। একটি ট্যাবে চাপ দিন।" />
        </p>
      </div>
      <div id="pfm-body" className="pfm">
        <div
          ref={bar}
          role="tablist"
          aria-label={bn ? "আপনার টাকার বিস্তারিত" : "Your money in detail"}
          onKeyDown={onKey}
          className="pfm-bar"
        >
          {panels.map((p) => {
            const on = p.key === active;
            return (
              <button
                key={p.key}
                type="button"
                id={`pfroom-${p.key}`}
                role="tab"
                aria-selected={on}
                aria-controls={`pfroom-panel-${p.key}`}
                tabIndex={on ? 0 : -1}
                className="pfm-tab"
                data-on={on ? "true" : undefined}
                onClick={() => {
                  setActive(p.key);
                  trackEvent("pf_open", { what: "tab", key: p.key });
                }}
              >
                {ICON[p.key] && <span className="pfm-icon" aria-hidden="true">{ICON[p.key]}</span>}
                <span className="pfm-label">
                  <T en={p.label.en} bn={p.label.bn} />
                </span>
              </button>
            );
          })}
        </div>
        {panels.map((p) => (
          <div
            key={p.key}
            id={`pfroom-panel-${p.key}`}
            role="tabpanel"
            aria-labelledby={`pfroom-${p.key}`}
            className="rp-room-panel pfm-panel flex flex-col gap-4"
            data-active={p.key === active ? "true" : "false"}
          >
            {p.body}
          </div>
        ))}
      </div>
    </section>
  );
}
