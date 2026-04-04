"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import FilterBar from "./FilterBar";
import TierTableSection from "./TierTableSection";
import TierDetailsSection from "./TierDetailsSection";
import RankRow from "./RankRow";
import type { ScoreItem, ScoreTiers } from "@/lib/api";
import { getTier } from "@/lib/constants";

type SortKey = "score" | "change_pct" | "div_yield_pct";

interface Props {
  tiers: ScoreTiers;
  counts: Record<string, number>;
}

export default function FilterableRankings({ tiers, counts }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeSector = searchParams.get("sector") || null;
  const activeCategory = searchParams.get("cat") || null;
  const activeSort = (searchParams.get("sort") as SortKey) || "score";

  const allItems = useMemo(
    () => [
      ...tiers.strong_buy,
      ...tiers.safe_buy,
      ...tiers.watch,
      ...tiers.avoid,
    ],
    [tiers]
  );

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const item of allItems) {
      if (item.sector) set.add(item.sector);
    }
    return Array.from(set).sort();
  }, [allItems]);

  const isFiltered = activeSector !== null || activeCategory !== null;

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const filteredAndSorted = useMemo(() => {
    if (!isFiltered && activeSort === "score") return null; // use default tier view

    let items = allItems;

    if (activeSector) {
      items = items.filter((i) => i.sector === activeSector);
    }
    if (activeCategory) {
      items = items.filter(
        (i) => (i.market_category ?? "").toUpperCase() === activeCategory
      );
    }

    items = [...items].sort((a, b) => {
      const av = a[activeSort] ?? -Infinity;
      const bv = b[activeSort] ?? -Infinity;
      return (bv as number) - (av as number);
    });

    return items;
  }, [allItems, activeSector, activeCategory, activeSort, isFiltered]);

  return (
    <>
      <FilterBar
        sectors={sectors}
        activeSector={activeSector}
        activeCategory={activeCategory}
        activeSort={activeSort}
        onSectorChange={(v) => updateParam("sector", v)}
        onCategoryChange={(v) => updateParam("cat", v)}
        onSortChange={(v) => updateParam("sort", v === "score" ? null : v)}
      />

      {filteredAndSorted ? (
        <section className="mb-7">
          <div className="filtered-summary">
            {filteredAndSorted.length} {filteredAndSorted.length === 1 ? "company" : "companies"}
            {activeSector ? ` in ${activeSector}` : ""}
            {activeCategory ? ` · Category ${activeCategory}` : ""}
          </div>
          <div className="rank-table rank-table-safe">
            {filteredAndSorted.map((item, i) => (
              <RankRow
                key={item.trading_code}
                item={item}
                rank={i + 1}
                tier={getTier(item.score)}
              />
            ))}
          </div>
          {filteredAndSorted.length === 0 && (
            <p className="text-xs text-[var(--ink-muted)] py-3 px-1.5">
              No companies match the selected filters.
            </p>
          )}
        </section>
      ) : (
        <>
          <TierTableSection tier="strong_buy" items={tiers.strong_buy} />
          <TierTableSection tier="safe_buy" items={tiers.safe_buy} />
          <TierDetailsSection tier="watch" items={tiers.watch} />
          <TierDetailsSection tier="avoid" items={tiers.avoid} />
        </>
      )}
    </>
  );
}
