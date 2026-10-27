"use client";

import { useEffect, useState, useMemo } from "react";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { pct } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import EmptyState from "@/components/ui/EmptyState";
import { DataTable, SortTh, Th, StockIdent, Price, Change } from "@/components/ui/Table";
import type { ScoreItem } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { sectorBn } from "@/lib/bn";

type SortCol =
  | "trading_code"
  | "company_name"
  | "sector"
  | "market_category"
  | "score"
  | "ltp"
  | "change_pct"
  | "eps"
  | "div_yield_pct";

interface Props {
  items: ScoreItem[];
}

const CATEGORIES = ["A", "B", "N", "Z"] as const;
const SORT_COLS: SortCol[] = [
  "trading_code", "company_name", "sector", "market_category", "score", "ltp", "change_pct", "eps", "div_yield_pct",
];
const TEXT_COLS: SortCol[] = ["trading_code", "company_name", "sector"];
const COL_COUNT = 10;

export default function StocksTable({ items }: Props) {
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const [search, setSearch] = useState("");
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("trading_code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sectors = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) if (i.sector) s.add(i.sector);
    return Array.from(s).sort();
  }, [items]);

  // ---- URL ⇄ state: ?q=…&sector=…&cat=A&sort=ltp&dir=desc ----
  const urlParams = useUrlParams();
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    if (!urlParams) return;
    const q = urlParams.get("q");
    if (q) setSearch(q);
    const sec = urlParams.get("sector");
    if (sec && sectors.includes(sec)) setActiveSector(sec);
    const cat = urlParams.get("cat");
    if (cat && (CATEGORIES as readonly string[]).includes(cat)) setActiveCategory(cat);
    const sort = urlParams.get("sort");
    if (sort && (SORT_COLS as string[]).includes(sort)) setSortCol(sort as SortCol);
    const dir = urlParams.get("dir");
    if (dir === "asc" || dir === "desc") setSortDir(dir);
    setUrlReady(true);
  }, [urlParams, sectors]);
  useUrlSync(
    {
      q: search.trim() || null,
      sector: activeSector,
      cat: activeCategory,
      sort: sortCol === "trading_code" && sortDir === "asc" ? null : sortCol,
      dir: sortCol === "trading_code" && sortDir === "asc" ? null : sortDir,
    },
    urlReady
  );

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir(TEXT_COLS.includes(col) ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    let r = [...items];
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(i =>
      i.trading_code.toLowerCase().includes(q) ||
      (i.company_name ?? "").toLowerCase().includes(q)
    );
    if (activeSector) r = r.filter(i => i.sector === activeSector);
    if (activeCategory) r = r.filter(i => i.market_category === activeCategory);

    r.sort((a, b) => {
      const av: string | number | null = a[sortCol] ?? null;
      const bv: string | number | null = b[sortCol] ?? null;
      // Missing values sort last whichever direction is picked.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return r;
  }, [items, search, activeSector, activeCategory, sortCol, sortDir]);

  const th = { active: sortCol, dir: sortDir, onSort: handleSort };

  return (
    <div className="pb-8">
      {/* Controls */}
      <div className="dt-toolbar">
        <input
          className="dt-search"
          type="search"
          placeholder={L("Search code or company…", "কোড বা কোম্পানির নাম লিখুন…")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label={L("Search shares", "শেয়ার খুঁজুন")}
        />

        <select
          className="dt-select"
          value={activeSector ?? ""}
          onChange={e => setActiveSector(e.target.value || null)}
          aria-label={L("Filter by sector", "সেক্টর বাছুন")}
        >
          <option value="">{L("All sectors", "সব সেক্টর")}</option>
          {sectors.map(s => <option key={s} value={s}>{lang === "bn" ? sectorBn(s) : s}</option>)}
        </select>

        <div className="dt-pills" role="group" aria-label={L("Market category", "ক্যাটাগরি")}>
          <button
            type="button"
            className={`dt-pill${activeCategory === null ? " is-active" : ""}`}
            aria-pressed={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          ><T en="All" bn="সব" /></button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`dt-pill${activeCategory === cat ? " is-active" : ""}`}
              aria-pressed={activeCategory === cat}
              aria-label={L(`Category ${cat}`, `${cat} ক্যাটাগরি`)}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >{cat}</button>
          ))}
        </div>

        <span className="dt-count" aria-live="polite">
          <T en={`${filtered.length} shares`} bn={`${filtered.length}টি শেয়ার`} />
        </span>
      </div>

      {/* Table */}
      <DataTable>
        <thead>
          <tr>
            <Th align="right">#</Th>
            <Th srLabel={L("Watchlist", "ওয়াচলিস্ট")} />
            <SortTh col="trading_code"    label={<T en="Share" bn="শেয়ার" />}  {...th} />
            <SortTh col="sector"          label={<T en="Sector" bn="সেক্টর" />} {...th} secondary />
            <SortTh col="market_category" label={<T en="Cat" bn="ক্যাটাগরি" />}    {...th} />
            <SortTh col="score"           label={<T en="Score" bn="স্কোর" />}  {...th} align="right" />
            <SortTh col="ltp"             label={<T en="Price" bn="দাম" />}  {...th} align="right" />
            <SortTh col="change_pct"      label={<T en="Today" bn="আজ" />}  {...th} align="right" />
            <SortTh col="eps"             label={<T en="EPS" bn="ইপিএস" />}    {...th} align="right" />
            <SortTh col="div_yield_pct"   label={<T en="Yield" bn="ইল্ড" />}  {...th} align="right" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, idx) => (
            <tr key={item.trading_code}>
              <td data-cell="rank">{idx + 1}</td>

              <td data-cell="star">
                <StarButton code={item.trading_code} />
              </td>

              <td data-cell="ident">
                <StockIdent code={item.trading_code} name={item.company_name} />
              </td>

              <td data-secondary className="dt-muted">
                {item.sector ? <T en={item.sector} bn={sectorBn(item.sector)} /> : "—"}
              </td>

              <td data-cell="meta" data-label={L("Cat", "ক্যাটাগরি")} className="dt-muted">
                {item.market_category ?? "—"}
              </td>

              <td data-cell="score" className="dt-num">
                <span className="dt-score">
                  {item.score != null && (
                    <span className="dt-tier"><TierPill score={item.score} /></span>
                  )}
                  <ScoreBadge score={item.score} size="sm" />
                </span>
              </td>

              <td data-cell="price" className="dt-num">
                <Price value={item.ltp} />
              </td>

              <td data-cell="change" className="dt-num">
                <Change value={item.change_pct} />
              </td>

              <td data-cell="meta" data-label={L("EPS", "ইপিএস")} className="dt-num nums">
                {item.eps != null ? item.eps.toFixed(2) : "—"}
              </td>

              <td data-cell="meta" data-label={L("Yield", "ইল্ড")} className="dt-num nums">
                {item.div_yield_pct != null ? pct(item.div_yield_pct, 1) : "—"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={COL_COUNT} className="dt-empty">
                <EmptyState
                  variant="bare"
                  title={<T en="No shares match your filters" bn="এই ফিল্টারে কোনো শেয়ার মিলছে না" />}
                  message={
                    <T
                      en="Try a shorter search, or clear the sector and category."
                      bn="আরও ছোট করে খুঁজুন, অথবা সেক্টর আর ক্যাটাগরি মুছে দেখুন।"
                    />
                  }
                />
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
