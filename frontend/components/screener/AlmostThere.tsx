"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import { T } from "@/components/i18n/T";
import type { ScreenerFilterDef } from "@/lib/api";
import { money } from "@/lib/formatters";
import { NEAR_FALL_PCT, figureWords, type NearMiss } from "@/lib/screener";

/** Rows shown before "Show all". */
const SHOWN = 5;

/**
 * "Almost there" (Premium, under the result): shares that miss the screen by
 * ONE filter a lower price would fix (P/E, yield, P/B, price, place in its
 * year, size, our price check), within NEAR_FALL_PCT of today — the filter it
 * misses with its figure now, the price that brings it in, and "Alert me"
 * (a price alert at that price). Closest first. Nothing when none.
 */
export default function AlmostThere({
  near,
  defs,
}: {
  near: NearMiss[];
  defs: Map<string, ScreenerFilterDef>;
}) {
  const [all, setAll] = useState(false);
  if (!near.length) return null;
  const shown = all ? near : near.slice(0, SHOWN);

  return (
    <section className="scr-near" aria-labelledby="scr-near-title">
      <h3 id="scr-near-title" className="text-base font-bold text-text-main">
        <T en="Almost there" bn="প্রায় মিলেছে" />
      </h3>
      <p className="text-sm text-text-main">
        <T
          en={`${near.length} more ${near.length === 1 ? "share misses" : "shares miss"} by one filter that a price fall of ${NEAR_FALL_PCT}% or less would fix. Set an alert at the price that brings it in.`}
          bn={`আরও ${near.length}টি শেয়ার মাত্র একটি ফিল্টারে মেলেনি, যা দাম ${NEAR_FALL_PCT}% বা কম কমলেই মিলে যাবে। যে দামে মিলবে, সেখানে অ্যালার্ট দিন।`}
        />
      </p>
      <ul className="scr-near-list">
        {shown.map((n) => {
          const d = defs.get(n.filter.key);
          const now = d ? figureWords(n.row.v[n.filter.key], d) : null;
          const price = typeof n.row.v.price === "number" ? n.row.v.price : null;
          const fall = n.fallPct < 1 ? { en: "less than 1", bn: "1-এর কম" } : { en: String(Math.round(n.fallPct)), bn: String(Math.round(n.fallPct)) };
          return (
            <li key={n.row.code} className="scr-near-row">
              <div className="min-w-0">
                <Link href={`/stock/${encodeURIComponent(n.row.code)}`} className="scr-near-name">
                  {n.row.name} <span className="scr-near-code">{n.row.code}</span>
                </Link>
                {d && now && (
                  <p className="text-sm text-text-main">
                    <T en={`Misses: ${d.short_en} is ${now.en}`} bn={`মেলেনি: ${d.short_bn} এখন ${now.bn}`} />
                  </p>
                )}
                <p className="scr-near-join nums">
                  <T
                    en={`Joins at ${money(n.join)} or lower · ${fall.en}% under today`}
                    bn={`${money(n.join)} বা কমে মিলবে · আজকের চেয়ে ${fall.bn}% কম`}
                  />
                </p>
              </div>
              <BuyBelowAlert
                code={n.row.code}
                target={n.join}
                ltp={price}
                w52High={typeof n.row.v.hi52 === "number" ? n.row.v.hi52 : null}
                w52Low={typeof n.row.v.lo52 === "number" ? n.row.v.lo52 : null}
              />
            </li>
          );
        })}
      </ul>
      {near.length > SHOWN && (
        <Button variant="quiet" onClick={() => setAll((x) => !x)}>
          {all ? <T en="Show fewer" bn="কম দেখান" /> : <T en={`Show all ${near.length}`} bn={`সব ${near.length}টি দেখুন`} />}
        </Button>
      )}
    </section>
  );
}
