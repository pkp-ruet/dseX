"use client";

import { useState, type ReactNode } from "react";
import { T } from "@/components/i18n/T";
import Tabs from "@/components/ui/Tabs";
import StockRow from "@/components/ui/StockRow";
import { crore } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import type { MarketMoverItem, MarketMoversData } from "@/lib/api";

type Tab = "gainers" | "losers" | "most_traded";

const ROWS = 5;

/**
 * The right half of "Today on the DSE": rose most · fell most · traded most,
 * five rows each. Every panel is in the server HTML (the hidden ones under
 * `hidden`), so Google sees all fifteen rows.
 */
export default function MoverTabs({ movers }: { movers: MarketMoversData }) {
  const lists: Record<Tab, MarketMoverItem[]> = {
    gainers: (movers.gainers ?? []).slice(0, ROWS),
    losers: (movers.losers ?? []).slice(0, ROWS),
    most_traded: (movers.most_traded ?? []).slice(0, ROWS),
  };
  const tabs = (
    [
      { key: "gainers", label: <T en="Rose most" bn="বেশি বেড়েছে" /> },
      { key: "losers", label: <T en="Fell most" bn="বেশি কমেছে" /> },
      { key: "most_traded", label: <T en="Traded most" bn="বেশি লেনদেন" /> },
    ] as { key: Tab; label: ReactNode }[]
  ).filter((t) => lists[t.key].length > 0);
  const [tab, setTab] = useState<Tab>(tabs[0]?.key ?? "gainers");
  if (tabs.length === 0) return null;

  return (
    <div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Today's biggest moves" idBase="lp-movers" />
      {tabs.map((t) => (
        <ol
          key={t.key}
          role="tabpanel"
          aria-labelledby={`lp-movers-${t.key}`}
          hidden={t.key !== tab}
          className="mt-2 divide-y divide-border"
        >
          {lists[t.key].map((m) => (
            <StockRow
              key={m.trading_code}
              code={m.trading_code}
              name={m.company_name}
              inset="none"
              sub={
                t.key === "most_traded" && m.value_mn != null ? (
                  <T en={`${crore(m.value_mn)} traded`} bn={`${croreBn(m.value_mn)} লেনদেন`} />
                ) : undefined
              }
              price={m.ltp}
              change={m.change_pct}
            />
          ))}
        </ol>
      ))}
    </div>
  );
}
