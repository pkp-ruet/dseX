"use client";

import { useState } from "react";
import { T } from "@/components/i18n/T";
import Tabs from "@/components/ui/Tabs";
import StockRow from "@/components/ui/StockRow";
import { useLang } from "@/context/LangContext";
import type { MarketMoverItem, MarketMoversData } from "@/lib/api";
import { crore } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import MkCard from "@/components/market-analysis/MkCard";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";

type Tab = "gainers" | "losers" | "most_traded";

const ROWS = 5;

/**
 * Block 5 of the market page — the shares that moved most: rose most, fell
 * most and traded most, five each. The reader's own shares wear H / ★. These
 * are the only shares the market page names: it says what moved the market,
 * it doesn't suggest what to buy.
 */
export default function TopMovers({ movers }: { movers: MarketMoversData | null | undefined }) {
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>("gainers");
  if (!movers) return null;
  const lists: Record<Tab, MarketMoverItem[]> = {
    gainers: movers.gainers ?? [],
    losers: movers.losers ?? [],
    most_traded: movers.most_traded ?? [],
  };
  if (!lists.gainers.length && !lists.losers.length && !lists.most_traded.length) return null;
  const rows = lists[tab].slice(0, ROWS);

  return (
    <MkCard
      id="mk-movers"
      title={<T en="Shares that moved most" bn="আজ সবচেয়ে বেশি নড়েছে যেসব শেয়ার" />}
      note={<T en="The five biggest of each." bn="প্রতিটিতে সবচেয়ে বড় পাঁচটি।" />}
    >
      <Tabs
        tabs={[
          { key: "gainers" as Tab, label: <T en="Rose most" bn="বেশি বেড়েছে" /> },
          { key: "losers" as Tab, label: <T en="Fell most" bn="বেশি কমেছে" /> },
          { key: "most_traded" as Tab, label: <T en="Traded most" bn="বেশি লেনদেন" /> },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel={lang === "bn" ? "কোন তালিকা" : "Which list"}
        idBase="mk-mov-tab"
      />
      <div className="mk-rows mk-mov-rows" role="tabpanel" aria-labelledby={`mk-mov-tab-${tab}`}>
        {rows.map((m) => (
          <StockRow
            key={m.trading_code}
            as="div"
            inset="bleed"
            code={m.trading_code}
            name={m.company_name}
            lang={lang}
            mark={<PersonalMark code={m.trading_code} />}
            sub={
              tab === "most_traded" && m.value_mn != null ? (
                <span className="tabular-nums">
                  <T en={`${crore(m.value_mn)} traded`} bn={`${croreBn(m.value_mn)} লেনদেন`} />
                </span>
              ) : undefined
            }
            price={m.ltp}
            change={m.change_pct}
          />
        ))}
      </div>
    </MkCard>
  );
}
