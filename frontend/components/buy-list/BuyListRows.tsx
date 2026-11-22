"use client";

import { useEffect, useState } from "react";
import BuyCase from "@/components/buy-list/BuyCase";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { StockRank } from "@/components/ui/StockRow";
import { IconAlert, IconCalendar, IconCheck, IconChevronDown } from "@/components/ui/icons";
import { companyShort, money } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import { trackEvent } from "@/lib/track";
import type { BuyListItem } from "@/lib/buy-list";

/** The thing to watch, named ("Auditor's note"), else the old words. */
function watchWords(item: BuyListItem) {
  return item.watch?.short ?? { en: "Something to watch", bn: "খেয়াল রাখার বিষয় আছে" };
}

/**
 * The row's one tag, or none: missed at the last close › a serious thing to
 * watch › a dividend's last day to buy › a smaller thing to watch (amber) ›
 * results coming › a quiet note (a smaller auditor note). Each says what it
 * is; colour only for what matters (2026-11-22).
 */
function Tag({ item }: { item: BuyListItem }) {
  if (item.grace) {
    return (
      <span className="bl-tag bl-tag--watch">
        <IconAlert size={13} />
        <T en="Missed at the last close" bn="শেষ দিনে আটকেছে" />
      </span>
    );
  }
  const level = item.watch?.level;
  const w = watchWords(item);
  const watch = (cls: string) => (
    <span className={`bl-tag ${cls}`}>
      {cls !== "bl-tag--note" && <IconAlert size={13} />}
      <T en={w.en} bn={w.bn} />
    </span>
  );
  if (item.watch && level === "red") return watch("bl-tag--red");
  const record = item.next.find((n) => n.kind === "record");
  if (record) {
    const d = dayShort(record.date);
    return (
      <span className="bl-tag bl-tag--date">
        <IconCalendar size={13} />
        <T en={`Dividend: last day to buy ${d.en}`} bn={`ডিভিডেন্ড: কেনার শেষ দিন ${d.bn}`} />
      </span>
    );
  }
  if (item.watch && level !== "note") return watch("bl-tag--watch");
  const results = item.next.find((n) => n.kind === "results");
  if (results) {
    const d = dayShort(results.date);
    return (
      <span className="bl-tag bl-tag--date">
        <IconCalendar size={13} />
        <T en={`Results due ${d.en}`} bn={`আর্থিক ফল আসবে ${d.bn}`} />
      </span>
    );
  }
  if (item.watch) return watch("bl-tag--note");
  return null;
}

/** Buy now or wait: today's price against the price it is worth buying
 *  under. A share kept on the list above that price says what to wait for. */
function Status({ item }: { item: BuyListItem }) {
  const { price, buy_below: buy } = item;
  if (price == null) return null;
  if (buy == null) {
    return (
      <span className="bl-st">
        <T en={`${money(price)} today`} bn={`আজ ${money(price)}`} />
      </span>
    );
  }
  if (price > buy) {
    return (
      <span className="bl-st bl-st--wait nums">
        <T
          en={`Wait for ${money(buy)} · today ${money(price)}`}
          bn={`${money(buy)} বা কমে কেনা ভালো · আজ ${money(price)}`}
        />
      </span>
    );
  }
  return (
    <span className="bl-st bl-st--ok nums">
      <IconCheck size={13} />
      <T
        en={`${money(price)} · under our buy price ${money(buy)}`}
        bn={`${money(price)} · আমাদের কেনার দাম ${money(buy)}-এর নিচে`}
      />
    </span>
  );
}

/** Rank · company · how far under our fair price, then buy-now-or-wait,
 *  then one short reason and its tag. */
function Head({ item }: { item: BuyListItem }) {
  const reason = item.why_short ?? (item.why_short === undefined ? item.why : null);
  const gap = item.margin_pct != null && item.margin_pct >= 1 ? item.margin_pct : null;
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
      <span className="bl-gap nums">
        {gap != null ? (
          <>
            <b>{gap}%</b>
            <T en="under our fair price" bn="ন্যায্য দামের চেয়ে কম" />
          </>
        ) : (
          <>
            <b className="bl-gap-px">{money(item.price)}</b>
            <T en="about our fair price" bn="প্রায় ন্যায্য দামে" />
          </>
        )}
      </span>
      <span className="bl-status">
        <Status item={item} />
      </span>
      <span className="bl-reason">
        {reason && (
          <span>
            <T en={reason.en} bn={reason.bn} />
          </span>
        )}
        <Tag item={item} />
      </span>
    </>
  );
}

/** One share opened, with no toggle: the free reader's share of the day. */
export function BuyRowOpen({ item }: { item: BuyListItem }) {
  return (
    <>
      <div className="bl-head bl-head--static">
        <Head item={item} />
      </div>
      <BuyCase item={item} />
    </>
  );
}

/**
 * The list: one row per share, the first open. A tap opens a share's price
 * and what to know in place and closes the one that was open. `#bl-CODE` in
 * the address opens that share (a notification can link to it).
 */
export default function BuyListRows({ items }: { items: BuyListItem[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.code ?? null);

  useEffect(() => {
    const code = decodeURIComponent(window.location.hash.replace(/^#bl-/, "")).toUpperCase();
    if (!code || !items.some((i) => i.code === code)) return;
    setOpen(code);
    requestAnimationFrame(() => document.getElementById(`bl-${code}`)?.scrollIntoView({ block: "start" }));
  }, [items]);

  // When the open share above closes, everything under it moves up by its
  // height. Hold the tapped row where it was on screen (the portfolio's rows
  // do the same), or the reader lands near the bottom of the list.
  const toggle = (code: string, el: HTMLElement) => {
    const before = el.getBoundingClientRect().top;
    const next = open === code ? null : code;
    if (next) trackEvent("buy_list_open", { code: next });
    setOpen(next);
    requestAnimationFrame(() => {
      const shift = el.getBoundingClientRect().top - before;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: "instant" });
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
              onClick={(e) => toggle(item.code, e.currentTarget)}
            >
              <Head item={item} />
              <span className="bl-chev" aria-hidden="true">
                <IconChevronDown size={14} />
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
