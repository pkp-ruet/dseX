"use client";

import { useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { IconArrowDown, IconArrowUp, IconChevron } from "@/components/ui/icons";

/** One place on the leaderboard. `move`: places climbed (+) or fell (−) since
 *  the comparison day, 0 = same place, "new" = not ranked then, null = no
 *  comparison (no history, or a rule-change day). */
export interface RankRow {
  rank: number;
  code: string;
  name: string;
  move: number | "new" | null;
}

/** Rows shown before "Show all" — the list runs to rank 50. */
const SHOW_TO_RANK = 50;

/** The FIFA-style ranking (2026-11-01): rank, how far it
 *  moved, the company. Every row is in the HTML; rows past rank 50 wait
 *  behind one button. */
export default function RankList({ rows, total }: { rows: RankRow[]; total: number }) {
  const [all, setAll] = useState(false);
  const hiddenCount = rows.filter((r) => r.rank > SHOW_TO_RANK).length;

  return (
    <section className="rk-board" aria-labelledby="rk-board-title">
      <div className="rk-board-top">
        <h2 id="rk-board-title" className="rk-board-title">
          <T en="Full ranking" bn="পুরো র‍্যাঙ্কিং" />
        </h2>
        <span className="rk-board-count">
          <T en={`${total} companies`} bn={`${total}টি কোম্পানি`} />
        </span>
      </div>
      <div className="rk-card">
        <ol className="rk-list">
          {rows.map((r) => (
            <li key={r.code} hidden={(!all && r.rank > SHOW_TO_RANK) || undefined}>
              <Link href={`/stock/${r.code}`} className="rk-line">
                <span className={`rk-pos${r.rank <= 3 ? ` rk-pos--${r.rank}` : ""}`}>
                  <span className="sr-only">
                    <T en="Rank" bn="র‍্যাঙ্ক" />{" "}
                  </span>
                  {r.rank}
                </span>
                <Move move={r.move} />
                <span className="rk-co">
                  <span className="rk-co-name">{r.name}</span>
                  <span className="rk-co-code">{r.code}</span>
                </span>
                <span className="rk-go" aria-hidden="true">
                  <span className="rk-go-word">
                    <T en="Analysis" bn="বিশ্লেষণ" />
                  </span>
                  <IconChevron size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {hiddenCount > 0 && (
          <div className="rk-more-wrap">
            <button type="button" className="rk-more" onClick={() => setAll((v) => !v)} aria-expanded={all}>
              {all ? (
                <T en="Show the top 50 only" bn="শুধু প্রথম 50টি দেখুন" />
              ) : (
                <T en={`Show all ${total} companies`} bn={`সব ${total}টি কোম্পানি দেখুন`} />
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** The rank change as a pill: ▲ 3 green, ▼ 2 red, – same, "New". */
function Move({ move }: { move: RankRow["move"] }) {
  const base = "rk-move";
  if (move === "new") {
    return (
      <span className={`${base} is-new`}>
        <T en="New" bn="নতুন" />
      </span>
    );
  }
  if (move == null || move === 0) {
    return (
      <span className={`${base} is-same`}>
        <span aria-hidden="true">–</span>
        {move === 0 && (
          <span className="sr-only">
            <T en="Same place" bn="একই জায়গায়" />
          </span>
        )}
      </span>
    );
  }
  const up = move > 0;
  const n = Math.abs(move);
  return (
    <span className={`${base} ${up ? "is-up" : "is-down"}`}>
      {up ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">
        {up ? (
          <T en={`Up ${n} ${n === 1 ? "place" : "places"}`} bn={`${n} ধাপ উঠেছে`} />
        ) : (
          <T en={`Down ${n} ${n === 1 ? "place" : "places"}`} bn={`${n} ধাপ নেমেছে`} />
        )}
      </span>
    </span>
  );
}
