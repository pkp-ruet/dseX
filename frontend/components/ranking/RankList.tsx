"use client";

import { useMemo } from "react";
import ListView from "@/components/lists/ListView";
import { SORT_CHANGE, SORT_NAME, SORT_PRICE, type ListRow, type ListSort } from "@/lib/lists";

/** One place on the leaderboard. `move`: places climbed (+) or fell (−) since
 *  the comparison day, 0 = same place, "new" = not ranked then, null = no
 *  comparison (no history, or a rule-change day). */
export interface RankRow {
  rank: number;
  code: string;
  name: string;
  sector: string | null;
  move: number | "new" | null;
  /** The latest official close and today's change (%). */
  price: number | null;
  change: number | null;
}

/** Rows shown before "Show all": the list runs to rank 50, every row in the HTML. */
const SHOW_TO_RANK = 50;

const SORTS: ListSort[] = [
  { id: "rank", label: { en: "Strongest first", bn: "সবচেয়ে শক্তিশালী আগে" }, dir: "asc" },
  { id: "move", label: { en: "Climbed most this week", bn: "এ সপ্তাহে সবচেয়ে বেশি উঠেছে" }, dir: "desc" },
  SORT_NAME,
  SORT_PRICE,
  SORT_CHANGE,
];

function moveFig(move: RankRow["move"]): ListRow["fig"] {
  if (move == null) return null;
  if (move === "new") return { en: "New", bn: "নতুন", tone: "watch", words: true };
  if (move === 0) return { en: "Same", bn: "একই", tone: "", words: true };
  return move > 0
    ? { en: `▲ ${move}`, bn: `▲ ${move}`, tone: "positive" }
    : { en: `▼ ${-move}`, bn: `▼ ${-move}`, tone: "negative" };
}

/**
 * All companies (2026-11-25: in THE list view, step 4 of the simplify
 * review). The FIFA-style ranking of 2026-11-01 — the company's real place,
 * how far it moved this week, its price — now draws the same bar and rows as
 * every list: a search by name or code, then Sector · Share price · Sort by
 * (Strongest first, Climbed most this week, A to Z …; "A to Z" replaced the
 * order switch). The place number is always the company's real rank. No
 * group pill here (the 2026-11-01 rule: no groups or scores on the ranking).
 * Every row is in the HTML for search; rows past rank 50 wait behind one
 * button.
 */
export default function RankList({ rows }: { rows: RankRow[] }) {
  const list = useMemo<ListRow<RankRow>[]>(
    () =>
      rows.map((r) => ({
        code: r.code,
        name: r.name,
        sector: r.sector,
        price: r.price,
        change: r.change,
        rank: r.rank,
        fig: moveFig(r.move),
        sort: { move: r.move === "new" ? null : r.move },
        isNew: false,
        data: r,
      })),
    [rows],
  );

  return (
    <ListView
      id="ranking"
      track="ranking"
      rows={list}
      figHead={{ en: "This week", bn: "এ সপ্তাহে" }}
      sorts={SORTS}
      defaultSort="rank"
      search
      sync
      allInHtml
      pageSize={SHOW_TO_RANK}
      moreLabel={(left) => ({ en: `Show the other ${left}`, bn: `বাকি ${left}টি দেখুন` })}
      empty={{
        title: { en: "No company matches", bn: "কোনো কোম্পানি মেলেনি" },
        message: { en: "Check the spelling, or try another sector or price.", bn: "বানান দেখুন, অথবা অন্য সেক্টর বা দাম বাছুন।" },
      }}
    />
  );
}
