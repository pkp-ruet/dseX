"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconArrowDown, IconArrowUp, IconChevron, IconSearch } from "@/components/ui/icons";
import { changePct, changeTone, money } from "@/lib/formatters";
import { useLang } from "@/context/LangContext";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";

type Order = "rank" | "az";

/** One place on the leaderboard. `move`: places climbed (+) or fell (−) since
 *  the comparison day, 0 = same place, "new" = not ranked then, null = no
 *  comparison (no history, or a rule-change day). */
export interface RankRow {
  rank: number;
  code: string;
  name: string;
  move: number | "new" | null;
  /** The latest official close and today's change (%). */
  price: number | null;
  change: number | null;
}

/** Rows shown before "Show all" — the list runs to rank 50. */
const SHOW_TO_RANK = 50;

/** The FIFA-style ranking (2026-11-01): rank, how far it
 *  moved, the company, its latest price. Every row is in the HTML; rows past rank 50 wait
 *  behind one button.
 *
 *  "All companies" since 2026-11-20 (the app map: the ranking and the A–Z
 *  list of all stocks became one list): an order switch — Strongest first or
 *  A to Z (`?order=az`) — and a search field by name or code. The rank
 *  number is always the company's real place. */
export default function RankList({ rows, total }: { rows: RankRow[]; total: number }) {
  const { bn } = useLang();
  const [all, setAll] = useState(false);
  const [order, setOrder] = useState<Order>("rank");
  const [q, setQ] = useState("");
  const params = useUrlParams();
  useEffect(() => {
    if (params?.get("order") === "az") setOrder("az");
    const query = params?.get("q");
    if (query) setQ(query);
  }, [params]);
  useUrlSync({ order: order === "az" ? "az" : null, q: q.trim() || null }, params !== null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = needle
      ? rows.filter((r) => r.code.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle))
      : rows;
    return order === "az" ? [...hit].sort((a, b) => a.name.localeCompare(b.name)) : hit;
  }, [rows, order, q]);
  const searching = q.trim().length > 0;
  const hiddenCount = searching ? 0 : Math.max(0, shown.length - SHOW_TO_RANK);

  return (
    <section className="rk-board" aria-labelledby="rk-board-title">
      <div className="rk-board-top">
        <h2 id="rk-board-title" className="rk-board-title">
          <T en="All companies" bn="সব কোম্পানি" />
        </h2>
        <span className="rk-board-count">
          {searching ? (
            <T en={`${shown.length} of ${total}`} bn={`${total}টির মধ্যে ${shown.length}টি`} />
          ) : (
            <T en={`${total} companies`} bn={`${total}টি কোম্পানি`} />
          )}
        </span>
      </div>
      <div className="rk-tools">
        <div className="rk-order" role="group" aria-label={bn ? "সাজানোর ক্রম" : "Order"}>
          <button type="button" aria-pressed={order === "rank"} onClick={() => setOrder("rank")}>
            <T en="Strongest first" bn="শক্তিশালী আগে" />
          </button>
          <button type="button" aria-pressed={order === "az"} onClick={() => setOrder("az")}>
            <T en="A to Z" bn="A থেকে Z" />
          </button>
        </div>
        <label className="rk-search" htmlFor="rk-search">
          <IconSearch size={16} />
          <span className="sr-only">{bn ? "কোম্পানি খুঁজুন" : "Find a company"}</span>
          <input
            id="rk-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={bn ? "নাম বা কোড" : "Name or code"}
            autoComplete="off"
          />
        </label>
      </div>
      <div className="rk-card">
        {shown.length === 0 && (
          <p className="rk-none">
            <T en={`No company matches “${q.trim()}”.`} bn={`“${q.trim()}” নামে কোনো কোম্পানি নেই।`} />
          </p>
        )}
        <ol className="rk-list">
          {shown.map((r, i) => (
            <li key={r.code} hidden={(!all && !searching && i >= SHOW_TO_RANK) || undefined}>
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
                <span className="rk-price">
                  <span className="rk-price-now">{money(r.price)}</span>
                  {r.change != null && (
                    <span className={`rk-price-chg ${changeTone(r.change)}`}>{changePct(r.change)}</span>
                  )}
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
                <T en="Show the first 50 only" bn="শুধু প্রথম 50টি দেখুন" />
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

/** The rank change as a pill: ▲ 3 green, ▼ 2 red, – same, "New". Also the
 *  dashboard's ranking card. */
export function Move({ move }: { move: RankRow["move"] }) {
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
