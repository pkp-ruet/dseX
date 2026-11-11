"use client";

import { useMemo } from "react";
import Link from "@/components/ui/Link";
import FindCard from "@/components/home/personalized/FindCard";
import { T } from "@/components/i18n/T";
import { IconCheck, IconCompare } from "@/components/ui/icons";
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { FREE_COMPARE, MAX_COMPARE, PRESETS, compareHref, shortName } from "@/lib/compare";

/**
 * "Compare stocks" on the dashboard (2026-11-12, user: "add a feature card in
 * homepage after stock screener"): what the page does in three lines, a
 * picture of one of its question cards — "Which pays you more cash?" on the
 * reader's own shares (or a ready-made set), bars sorted, the leader in clay,
 * from the prices already loaded — and a few comparisons to start from. A
 * picture and links only; the comparing happens on `/compare-stocks`.
 */
export default function CompareFeature({
  holdings,
  watchlist,
  priceMap,
  premium,
}: {
  holdings: PortfolioHolding[] | null;
  watchlist: string[];
  priceMap: Map<string, ScoreItem>;
  premium: boolean;
}) {
  const limit = premium ? MAX_COMPARE : FREE_COMPARE;

  // The reader's own shares: holdings by money in them, then followed shares.
  const mine = useMemo(() => {
    const held = [...(holdings ?? [])]
      .map((h) => ({ code: h.trading_code.toUpperCase(), value: h.qty * (priceMap.get(h.trading_code.toUpperCase())?.ltp ?? h.buy_price) }))
      .sort((a, b) => b.value - a.value)
      .map((h) => h.code);
    const out: string[] = [];
    for (const c of [...held, ...watchlist.map((w) => w.toUpperCase())]) {
      if (!out.includes(c) && priceMap.get(c)?.score != null) out.push(c);
      if (out.length >= FREE_COMPARE) break;
    }
    return out;
  }, [holdings, watchlist, priceMap]);

  const ownSet = mine.length >= 2;
  const pictureCodes = ownSet ? mine : PRESETS[0].codes;
  const bars = pictureCodes
    .map((c) => {
      const s = priceMap.get(c);
      return s ? { code: c, name: shortName(s.company_name, c), value: Math.round((s.div_yield_pct ?? 0) * 10) / 10 } : null;
    })
    .filter((b): b is { code: string; name: string; value: number } => b !== null)
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...bars.map((b) => b.value), 0) || 1;
  const lead = bars[0];
  const starts = PRESETS.slice(0, ownSet ? 2 : 3);

  return (
    <FindCard
      id="fc-compare"
      icon={<IconCompare size={14} />}
      eyebrow={<T en="Compare stocks" bn="শেয়ার তুলনা" />}
      tag={<T en="Free" bn="ফ্রি" />}
      title={<T en="Put shares side by side" bn="শেয়ার পাশাপাশি মিলিয়ে দেখুন" />}
      lead={
        <T
          en={`Pick up to ${limit} shares. We answer the same seven questions for each, so you see which one is ahead on what.`}
          bn={`${limit}টি পর্যন্ত শেয়ার বেছে নিন। প্রতিটির জন্য আমরা একই সাতটি প্রশ্নের উত্তর দিই, যাতে বোঝেন কোনটি কোন দিকে এগিয়ে।`}
        />
      }
      href="/compare-stocks"
      allLabel={<T en="Open" bn="খুলুন" />}
      footLabel={<T en="Open Compare stocks" bn="শেয়ার তুলনা খুলুন" />}
    >
      <div className="fcs">
        <ul className="fcs-points">
          <li>
            <IconCheck size={14} />
            <T en="Size, profit, dividend, price, loans and more" bn="আকার, মুনাফা, ডিভিডেন্ড, দাম, ঋণ আর আরও অনেক কিছু" />
          </li>
          <li>
            <IconCheck size={14} />
            <T en="The leader on each, named in one line" bn="প্রতিটিতে কে এগিয়ে, এক লাইনে" />
          </li>
          <li>
            <IconCheck size={14} />
            <T en="Every figure free, the dates ahead in one list" bn="সব হিসাব ফ্রি, সামনের তারিখ এক তালিকায়" />
          </li>
        </ul>

        {bars.length >= 2 && lead && (
          <Link prefetch={false} href={compareHref(pictureCodes)} className="fcs-shot" aria-label={bars.map((b) => b.name).join(", ")}>
            <span className="fcs-shot-label">
              {ownSet ? <T en="Your shares" bn="আপনার শেয়ার" /> : <T en="Example" bn="উদাহরণ" />}
              {" · "}
              <T en="Which pays you more cash?" bn="কোনটি বেশি নগদ টাকা দেয়?" />
            </span>
            <ul className="cmp-bars cmp-bars--mini" aria-hidden="true">
              {bars.map((b) => (
                <li key={b.code} className={`cmp-br ${b === lead ? "is-leader" : ""}`}>
                  <span className="cmp-br-name">
                    <span className="cmp-br-co">{b.name}</span>
                  </span>
                  <span className="cmp-br-track">
                    <i className={b === lead ? "is-lead" : ""} style={{ left: 0, width: `${(b.value / max) * 100}%` }} />
                  </span>
                  <span className="cmp-br-val">
                    <T en={b.value ? `${b.value}%` : "None"} bn={b.value ? `${b.value}%` : "নেই"} />
                  </span>
                </li>
              ))}
            </ul>
            <span className="fcc-more">
              <T en="and six more questions" bn="আর আরও ছয়টি প্রশ্ন" />
            </span>
          </Link>
        )}
      </div>

      <div className="fcs-starts">
        <p className="fcs-starts-label">
          <T en="Start with" bn="শুরু করুন" />
        </p>
        <ul>
          {ownSet && (
            <li>
              <Link prefetch={false} href={compareHref(mine)} className="fcs-start">
                <T en="Your shares" bn="আপনার শেয়ার" />
                <span className="fcs-start-n nums">{mine.length}</span>
              </Link>
            </li>
          )}
          {starts.map((p) => (
            <li key={p.en}>
              <Link prefetch={false} href={compareHref(p.codes)} className="fcs-start">
                <T en={p.en} bn={p.bn} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </FindCard>
  );
}
