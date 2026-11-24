"use client";

import { useEffect, useMemo, useState } from "react";
import ListView from "@/components/lists/ListView";
import BuyCase from "@/components/buy-list/BuyCase";
import { Status, Tag } from "@/components/buy-list/BuyListRows";
import { companyShort } from "@/lib/formatters";
import { trackEvent } from "@/lib/track";
import { SORT_NAME, SORT_PRICE, type ListRow, type ListSort } from "@/lib/lists";
import type { BuyListItem } from "@/lib/buy-list";
import type { TierKey } from "@/lib/constants";

const SORTS: ListSort[] = [
  { id: "rank", label: { en: "Our order", bn: "আমাদের ক্রম" }, dir: "asc" },
  { id: "gap", label: { en: "Most under our fair price", bn: "ন্যায্য দামের সবচেয়ে নিচে" }, dir: "desc" },
  SORT_PRICE,
  SORT_NAME,
];

const TIERS = new Set(["excellent", "good", "average", "weak"]);

/**
 * Today's Buy List in THE list view (2026-11-25, step 4 of the simplify
 * review): the same bar and rows as every list. Each row: its place on the
 * list · company · the one short reason · buy now or wait · one named tag ·
 * price today · how far under our fair price (the key figure). A tap opens
 * the share's case in place (`BuyCase`), the first one open; `#bl-CODE` in the
 * address opens that share (a notification can link to it).
 */
export default function BuyListView({ items }: { items: BuyListItem[] }) {
  const rows = useMemo<ListRow<BuyListItem>[]>(
    () =>
      items.map((item) => {
        const gap = item.margin_pct != null && item.margin_pct >= 1 ? item.margin_pct : null;
        const reason = item.why_short ?? (item.why_short === undefined ? item.why : null);
        return {
          code: item.code,
          name: companyShort(item.name) || item.code,
          sector: item.sector,
          tier: TIERS.has(item.tier) ? (item.tier as TierKey) : null,
          price: item.price,
          change: item.change_pct,
          fig: gap != null
            ? { en: `${gap}%`, bn: `${gap}%`, tone: "positive" }
            : { en: "About", bn: "প্রায় সমান", tone: "", words: true },
          sort: { gap: item.margin_pct },
          why: reason ?? null,
          rank: item.rank,
          isNew: item.new,
          data: item,
        };
      }),
    [items],
  );

  const [open, setOpen] = useState<string | null>(items[0]?.code ?? null);
  useEffect(() => {
    const code = decodeURIComponent(window.location.hash.replace(/^#bl-/, "")).toUpperCase();
    if (!code || !items.some((i) => i.code === code)) return;
    setOpen(code);
    requestAnimationFrame(() => document.getElementById(`bl-${code}`)?.scrollIntoView({ block: "start" }));
  }, [items]);

  return (
    <ListView
      id="buy-list"
      track="buy-list"
      rows={rows}
      figHead={{ en: "Under our fair price", bn: "ন্যায্য দামের নিচে" }}
      sorts={SORTS}
      defaultSort="rank"
      sync
      rowId={(r) => `bl-${r.code}`}
      defaultOpen={open}
      onToggle={(code, isOpen) => isOpen && trackEvent("buy_list_open", { code })}
      renderLines={(r) => (
        <span className="lv-lines bl-lv-lines">
          <Status item={r.data!} />
          <Tag item={r.data!} />
        </span>
      )}
      renderOpen={(r) => <BuyCase item={r.data!} />}
      empty={{
        title: { en: "No share on the list fits", bn: "তালিকার কোনো শেয়ার মেলেনি" },
        message: { en: "Try another sector or price.", bn: "অন্য সেক্টর বা দাম বাছুন।" },
      }}
    />
  );
}
