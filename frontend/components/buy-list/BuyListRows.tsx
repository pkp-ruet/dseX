"use client";

import { useEffect, useState } from "react";
import BuyCase from "@/components/buy-list/BuyCase";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { StockRank } from "@/components/ui/StockRow";
import { IconCalendar, IconChevronDown } from "@/components/ui/icons";
import { PRICE_WORDS } from "@/lib/constants";
import { changePct, changeTone, companyShort, money } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import { trackEvent } from "@/lib/track";
import type { BuyListItem } from "@/lib/buy-list";

/** The row's one-line summary: how far under our fair price, the company's
 *  group, the price word, profit, warnings and the nearest date. */
function Meta({ item }: { item: BuyListItem }) {
  const pw = PRICE_WORDS[item.price_word];
  const more = item.watch ? 1 + (item.watch.more ?? 0) : 0;
  const first = item.next[0];
  return (
    <>
      {item.margin_pct != null && (
        <span className="bl-gap nums">
          <T en={`${item.margin_pct}% under our fair price`} bn={`ন্যায্য দামের চেয়ে ${item.margin_pct}% কম`} />
        </span>
      )}
      <span className="bl-chip">
        <T en={item.group.en} bn={item.group.bn} />
      </span>
      <span className="bl-chip">
        <T en={pw.en} bn={pw.bn} />
      </span>
      <span className={`bl-chip bl-chip--${item.profit.tone}`}>
        <T en={item.profit.en} bn={item.profit.bn} />
      </span>
      {more > 0 ? (
        <span className="bl-chip bl-chip--watch">
          <T
            en={`${more} thing${more > 1 ? "s" : ""} to watch`}
            bn={`খেয়াল রাখার ${more}টি বিষয়`}
          />
        </span>
      ) : (
        <span className="bl-chip">
          <T en="No warnings" bn="কোনো সতর্কতা নেই" />
        </span>
      )}
      {first && (
        <span className="bl-date">
          <IconCalendar size={13} />
          {first.kind === "results" ? (
            <T en={`Results ${dayShort(first.date).en}`} bn={`আর্থিক ফল ${dayShort(first.date).bn}`} />
          ) : (
            <T en={`Buy by ${dayShort(first.date).en}`} bn={`কেনার শেষ দিন ${dayShort(first.date).bn}`} />
          )}
        </span>
      )}
    </>
  );
}

function Ident({ item }: { item: BuyListItem }) {
  return (
    <>
      <StockRank n={item.rank} solid={item.rank <= 3} />
      <span className="bl-id">
        <span className="bl-name">
          {companyShort(item.name) || item.code}
          {item.new && (
            <span className="bl-new">
              <T en="New" bn="নতুন" />
            </span>
          )}
        </span>
        <span className="bl-sub">
          {item.code}
          {item.sector && (
            <>
              <span aria-hidden="true"> · </span>
              <T en={item.sector} bn={item.sector_bn || sectorBn(item.sector)} />
            </>
          )}
          <PersonalMark code={item.code} />
        </span>
      </span>
      <span className="bl-px">
        <span className="nums">{money(item.price)}</span>
        <span className={`nums ${changeTone(item.change_pct)}`}>{changePct(item.change_pct, 1)}</span>
      </span>
    </>
  );
}

/** One share opened, with no toggle: the free reader's example of the day. */
export function BuyRowOpen({ item }: { item: BuyListItem }) {
  return (
    <article className="bl-row" data-open="">
      <div className="bl-head bl-head--static">
        <Ident item={item} />
        <span className="bl-meta">
          <Meta item={item} />
        </span>
      </div>
      <BuyCase item={item} />
    </article>
  );
}

/**
 * The list: one row per share, the first open. A tap opens a share's case in
 * place and closes the one that was open. `#bl-CODE` in the address opens
 * that share (a notification can link to it).
 */
export default function BuyListRows({ items }: { items: BuyListItem[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.code ?? null);

  useEffect(() => {
    const code = decodeURIComponent(window.location.hash.replace(/^#bl-/, "")).toUpperCase();
    if (!code || !items.some((i) => i.code === code)) return;
    setOpen(code);
    requestAnimationFrame(() => document.getElementById(`bl-${code}`)?.scrollIntoView({ block: "start" }));
  }, [items]);

  const toggle = (code: string) => {
    setOpen((cur) => {
      const next = cur === code ? null : code;
      if (next) trackEvent("buy_list_open", { code: next });
      return next;
    });
  };

  return (
    <ol className="bl-rows soft-card">
      {items.map((item) => {
        const isOpen = open === item.code;
        return (
          <li key={item.code} id={`bl-${item.code}`} className="bl-row" data-open={isOpen ? "" : undefined}>
            <button
              type="button"
              className="bl-head"
              aria-expanded={isOpen}
              aria-controls={`bl-case-${item.code}`}
              onClick={() => toggle(item.code)}
            >
              <Ident item={item} />
              <span className="bl-meta">
                <Meta item={item} />
                <span className="bl-chev" aria-hidden="true">
                  <IconChevronDown size={14} />
                </span>
              </span>
            </button>
            <div id={`bl-case-${item.code}`} hidden={!isOpen}>
              <BuyCase item={item} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
