"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import StockRow from "@/components/ui/StockRow";
import EmptyState from "@/components/ui/EmptyState";
import PremiumGate from "@/components/premium/PremiumGate";
import type { LatestResultRow } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { FREE_RESULTS_ROWS, splitFree } from "@/lib/free-share";
import { RESULT_LEVEL, RESULT_LEVEL_ORDER } from "@/lib/results";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";

const PAGE = 50;
type Filter = "all" | LatestResultRow["level"];

/** Rows grouped by the day they were posted (rows arrive newest first). */
function byDay(rows: LatestResultRow[]): { day: string; items: LatestResultRow[] }[] {
  const groups: { day: string; items: LatestResultRow[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.day === r.post_date) last.items.push(r);
    else groups.push({ day: r.post_date, items: [r] });
  }
  return groups;
}

/**
 * Every company's latest quarterly report, newest first, grouped by the day
 * it was posted. Each row taps through to the explainer on the stock page.
 * The level filter lives in the URL (`?level=good`).
 *
 * Free readers see the counts and the newest FREE_RESULTS_ROWS reports of the
 * chosen filter; the rest is behind the Premium lock (screen-only, like every
 * lock — the rows stay in the HTML Google reads, marked `.premium-locked`).
 */
export default function ResultsFeed({
  rows, counts,
}: {
  rows: LatestResultRow[];
  counts: Record<LatestResultRow["level"], number>;
}) {
  const { bn } = useLang();
  const t = (en: string, b: string) => (bn ? b : en);
  const urlParams = useUrlParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    const lv = urlParams?.get("level");
    if (lv && (RESULT_LEVEL_ORDER as string[]).includes(lv)) setFilter(lv as Filter);
  }, [urlParams]);
  useUrlSync({ level: filter === "all" ? null : filter }, urlParams !== null);

  const filtered = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.level === filter)), [rows, filter]);
  const [free, locked] = splitFree(filtered.slice(0, shown), FREE_RESULTS_ROWS);
  const lockedTotal = Math.max(0, filtered.length - FREE_RESULTS_ROWS);
  const lockedBetter = filtered.slice(FREE_RESULTS_ROWS).filter((r) => r.level === "good").length;

  const pick = (f: Filter) => {
    setFilter(f);
    setShown(PAGE);
  };

  const list = (items: LatestResultRow[]) => (
    <div className="space-y-6">
      {byDay(items).map((g) => (
        <section key={g.day} aria-label={formatDate(g.day)}>
          <h2 className="mb-2 text-sm font-bold text-text-muted">
            <T en={`Posted ${formatDate(g.day)}`} bn={`প্রকাশ: ${bnDate(g.day)}`} />
          </h2>
          <Card padding="none">
            <ul>
              {g.items.map((r) => (
                <StockRow
                  key={r.code}
                  as="li"
                  inset="card"
                  code={r.code}
                  name={r.name}
                  href={`/stock/${encodeURIComponent(r.code)}#results`}
                  sub={<T en={r.headline_en} bn={r.headline_bn} />}
                  subTone={RESULT_LEVEL[r.level].tone}
                  subClamp
                  detail={r.profit_en || r.profit_bn ? <T en={r.profit_en ?? ""} bn={r.profit_bn ?? ""} /> : undefined}
                  price={r.price}
                  change={r.change_pct}
                />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={t("Filter results", "ফল বাছাই")}>
        <Chip active={filter === "all"} onClick={() => pick("all")}>
          <T en="All" bn="সব" /> <span className="tabular-nums">{rows.length}</span>
        </Chip>
        {RESULT_LEVEL_ORDER.map((lv) => (
          <Chip key={lv} active={filter === lv} onClick={() => pick(lv)}>
            <T en={RESULT_LEVEL[lv].short} bn={RESULT_LEVEL[lv].shortBn} />{" "}
            <span className="tabular-nums">{counts[lv] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={<T en="No reports here" bn="এখানে কোনো প্রতিবেদন নেই" />}
          message={
            <T
              en="No company's latest report falls in this group right now."
              bn="এই ভাগে এখন কোনো কোম্পানির সর্বশেষ প্রতিবেদন নেই।"
            />
          }
        />
      ) : (
        <>
          {list(free)}
          {locked.length > 0 && (
            <PremiumGate
              label={{ en: "Every company's results", bn: "সব কোম্পানির ফল" }}
              preview="blur"
              peek={220}
              stakes={[
                { en: `${lockedTotal} more companies' latest results`, bn: `আরও ${lockedTotal}টি কোম্পানির সর্বশেষ ফল` },
                lockedBetter > 0
                  ? { en: `${lockedBetter} of them earned clearly more than a year ago`, bn: `এর মধ্যে ${lockedBetter}টির মুনাফা গত বছরের চেয়ে স্পষ্টভাবে বেশি` }
                  : "",
              ]}
              className="mt-6"
            >
              {list(locked)}
              {filtered.length > shown && (
                <div className="mt-6 flex justify-center">
                  <Button variant="quiet" onClick={() => setShown((n) => n + PAGE)}>
                    <T
                      en={`Show more (${filtered.length - shown} left)`}
                      bn={`আরও দেখুন (${filtered.length - shown}টি বাকি)`}
                    />
                  </Button>
                </div>
              )}
            </PremiumGate>
          )}
        </>
      )}
    </div>
  );
}
