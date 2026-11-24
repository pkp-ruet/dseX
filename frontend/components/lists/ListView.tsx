"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { T } from "@/components/i18n/T";
import ListBar, { type BarOption } from "./ListBar";
import { usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import ListRows, { LIST_PAGE, type ListGroup } from "./ListRows";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { trackEvent } from "@/lib/track";
import { sectorBn } from "@/lib/bn";
import {
  PRICE_PRESETS, passesFilter, sortRows,
  type Bi, type ListChip, type ListFilter, type ListRow, type ListSort,
} from "@/lib/lists";

const EMPTY: { title: Bi; message?: Bi } = {
  title: { en: "No share fits right now", bn: "এই মুহূর্তে কোনো শেয়ার মেলেনি" },
  message: { en: "Try another sector or price.", bn: "অন্য সেক্টর বা দাম বাছুন।" },
};

/**
 * THE list view (2026-11-25, step 4 of the simplify review: "every list opens
 * the same way"). The bar — the list's own chips, a search for long lists,
 * then Sector · Share price · Sort by, each choice with its count — over the
 * shared rows (`ListRows`). Filtering and sorting run in the browser over the
 * rows the page rendered, so the server HTML holds the whole list for search.
 *
 * `sync` mirrors the choices into the URL (`sector`, `price`, `sort`, the
 * chip under `chipParam`, `q`), so a shared link or the back button reopens
 * the same view; give it to at most one list on a page.
 */
export default function ListView<T>({
  id,
  rows,
  figHead,
  sorts,
  defaultSort,
  chips,
  chipParam = "show",
  chipValue,
  onChipChange,
  chipCounts = true,
  chipTest,
  mineChip = false,
  search = false,
  priceFilter = true,
  sync = false,
  pageSize = LIST_PAGE,
  allInHtml = false,
  masked = false,
  maskKeepSector = false,
  renderLines,
  renderOpen,
  defaultOpen,
  onToggle,
  groupOf,
  rowId,
  empty,
  moreLabel,
  card = true,
  above,
  track,
}: {
  /** Unique on the page: the bar's control ids. */
  id: string;
  rows: ListRow<T>[];
  figHead: Bi;
  sorts: ListSort[];
  /** The list's own order (its sort id); grouping and fixed ranks hold only in it. */
  defaultSort: string;
  chips?: ListChip[];
  chipParam?: string;
  /** Control the chip from outside (a report's kind cards pick it). */
  chipValue?: string;
  onChipChange?: (chip: string) => void;
  chipCounts?: boolean;
  chipTest?: (row: ListRow<T>, chip: string) => boolean;
  /** Add a "Your shares" chip (holdings ∪ watchlist) when any row is the reader's. */
  mineChip?: boolean;
  search?: boolean;
  /** false: no Share price box (rows without a price, a masked list). */
  priceFilter?: boolean;
  sync?: boolean;
  pageSize?: number;
  allInHtml?: boolean;
  masked?: boolean;
  maskKeepSector?: boolean;
  renderLines?: (row: ListRow<T>) => ReactNode;
  renderOpen?: (row: ListRow<T>) => ReactNode;
  defaultOpen?: string | null;
  onToggle?: (code: string, open: boolean) => void;
  groupOf?: (row: ListRow<T>) => ListGroup | null;
  rowId?: (row: ListRow<T>) => string;
  empty?: { title: Bi; message?: Bi };
  moreLabel?: (left: number) => Bi;
  /** Draw the list as its own card (off inside a card that already pads it). */
  card?: boolean;
  /** Something between the bar and the rows (a count line, a note). */
  above?: (shown: number) => ReactNode;
  /** GA area name for `list_narrow`. */
  track?: string;
}) {
  const [sector, setSector] = useState("");
  const [price, setPrice] = useState(-1);
  const [ownChip, setOwnChip] = useState("");
  const chip = chipValue ?? ownChip;
  const setChip = (c: string) => {
    setOwnChip(c);
    onChipChange?.(c);
  };
  const [q, setQ] = useState("");
  const [sortId, setSortId] = useState(defaultSort);
  const [limit, setLimit] = useState(pageSize);

  const params = useUrlParams();
  useEffect(() => {
    if (!sync || !params) return;
    const s = params.get("sector");
    if (s) setSector(s);
    const p = Number(params.get("price"));
    if (params.get("price") && Number.isInteger(p) && p >= 0 && p < PRICE_PRESETS.length) setPrice(p);
    const c = params.get(chipParam);
    if (c && (chips?.some((x) => x.id === c) || (mineChip && c === "mine"))) setChip(c);
    const so = params.get("sort");
    if (so && sorts.some((x) => x.id === so)) setSortId(so);
    const query = params.get("q");
    if (query) setQ(query);
  }, [sync, params, chipParam, chips, sorts, mineChip]);
  useUrlSync(
    {
      sector: sector || null,
      price: price >= 0 ? String(price) : null,
      [chipParam]: chip || null,
      sort: sortId !== defaultSort ? sortId : null,
      q: q.trim() || null,
    },
    sync && params !== null,
  );

  const { portfolio, watchlist } = usePersonalCodesCtx();
  const mineSet = useMemo(
    () => new Set([...portfolio, ...watchlist].map((c) => c.toUpperCase())),
    [portfolio, watchlist],
  );
  const mineN = mineChip ? rows.filter((r) => mineSet.has(r.code.toUpperCase())).length : 0;
  const allChips: ListChip[] | undefined =
    chips || mineN > 0
      ? [...(chips ?? []), ...(mineN > 0 ? [{ id: "mine", label: { en: "Your shares", bn: "আপনার শেয়ার" } }] : [])]
      : undefined;

  const filter: ListFilter = { sector, price, chip, q };
  const test = (r: ListRow, c: string) =>
    c === "mine" && mineChip
      ? mineSet.has(r.code.toUpperCase())
      : chipTest
        ? (chipTest as (r: ListRow, c: string) => boolean)(r, c)
        : (r.tags ?? []).includes(c);
  const count = (f: Partial<ListFilter>) => rows.filter((r) => passesFilter(r, { ...filter, ...f }, test)).length;

  const sectors = useMemo(() => {
    const by = new Map<string, number>();
    for (const r of rows) if (r.sector) by.set(r.sector, (by.get(r.sector) ?? 0) + 1);
    return [...by.keys()].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const sort = sorts.find((s) => s.id === sortId) ?? null;
  const inOwnOrder = sortId === defaultSort;
  const shown = useMemo(() => {
    const hit = rows.filter((r) => passesFilter(r, filter, test));
    return inOwnOrder ? hit : sortRows(hit, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sector, price, chip, q, sortId, mineSet]);

  const narrow = (key: string, value: string) => {
    setLimit(pageSize);
    if (track) trackEvent("list_narrow", { list: track, key, value: value || "all" });
  };

  const sectorOpts: BarOption[] = sectors.map((s) => ({
    value: s,
    label: { en: s, bn: sectorBn(s) },
    count: count({ sector: s }),
  }));
  const priceOpts: BarOption[] = PRICE_PRESETS.map((p, i) => ({
    value: String(i),
    label: { en: p.en, bn: p.bn },
    count: count({ price: i }),
  }));
  const chipOpts: BarOption[] | null = allChips
    ? [
        { value: "", label: { en: "All", bn: "সব" }, count: chipCounts ? count({ chip: "" }) : undefined },
        ...allChips.map((c) => ({ value: c.id, label: c.label, count: chipCounts ? count({ chip: c.id }) : undefined })),
      ]
    : null;

  const bar = (
    <ListBar
      idPrefix={`lv-${id}`}
      className="lv-bar"
      chips={chipOpts ? { value: chip, options: chipOpts, onChange: (v) => { setChip(v); narrow("chip", v); } } : null}
      search={search ? { value: q, onChange: (v) => { setQ(v); setLimit(pageSize); }, placeholder: { en: "Search by name or code", bn: "নাম বা কোড দিয়ে খুঁজুন" } } : null}
      sector={sectors.length > 1 ? { value: sector, all: count({ sector: "" }), options: sectorOpts, onChange: (v) => { setSector(v); narrow("sector", v); } } : null}
      price={priceFilter ? { value: price >= 0 ? String(price) : "", all: count({ price: -1 }), options: priceOpts, onChange: (v) => { setPrice(v === "" ? -1 : Number(v)); narrow("price", v); } } : null}
      sort={sorts.length > 1 ? { value: sortId, options: sorts.map((s) => ({ value: s.id, label: s.label })), onChange: (v) => { setSortId(v); narrow("sort", v); } } : null}
    />
  );

  const searching = q.trim().length > 0;
  return (
    <div className={`lv${card ? " lv--card" : ""}`} id={`lv-${id}`}>
      {bar}
      {above?.(shown.length)}
      {shown.length === 0 ? (
        <EmptyState
          title={<T en={(empty ?? EMPTY).title.en} bn={(empty ?? EMPTY).title.bn} />}
          message={(empty ?? EMPTY).message ? <T en={(empty ?? EMPTY).message!.en} bn={(empty ?? EMPTY).message!.bn} /> : undefined}
        />
      ) : (
        <ListRows
          rows={shown}
          figHead={figHead}
          limit={searching && allInHtml ? shown.length : limit}
          onMore={() => setLimit((x) => (allInHtml ? shown.length : x + pageSize))}
          moreLabel={moreLabel}
          allInHtml={allInHtml}
          masked={masked}
          maskKeepSector={maskKeepSector}
          renderLines={renderLines}
          renderOpen={renderOpen}
          defaultOpen={defaultOpen}
          onToggle={onToggle}
          groupOf={inOwnOrder && !searching ? groupOf : undefined}
          rowId={rowId}
        />
      )}
    </div>
  );
}
