"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import TierPill from "@/components/ui/TierPill";
import { T } from "@/components/i18n/T";
import { IconChevronDown, IconChevronRight } from "@/components/ui/icons";
import { changePct, changeTone, formatDate, money } from "@/lib/formatters";
import type { NotificationItem, WatchlistMetaEntry } from "@/lib/api";
import type { TierKey } from "@/lib/constants";
import { bnDate } from "@/lib/bn";
import WatchButton from "@/components/watch-rules/WatchButton";
import FeedRow, { itemRowProps } from "@/components/feed/FeedRow";

export interface WatchSheetRow {
  code: string;
  name: string;
  ltp: number | null;
  change: number | null;
  tier: TierKey | null;
  meta: WatchlistMetaEntry | null;
}

/**
 * A watched share's sheet on My shares (2026-11-25, step 3 of the simplify
 * review: one list, one sheet for every row). The same shape as an owned
 * share's sheet (`PfShareSheet`): the price, what it did since the reader
 * started watching, what happened on it lately (the Updates feed's own rows),
 * then "I own it" and the share's page; "More" holds what we tell them
 * (the Watch sheet) and Stop watching.
 */
export default function WatchShareSheet({
  row,
  updates,
  open,
  onClose,
  onOwn,
  onStop,
}: {
  row: WatchSheetRow | null;
  updates: NotificationItem[];
  open: boolean;
  onClose: () => void;
  /** "I own it": the add dialog, started on this share. */
  onOwn: () => void;
  onStop: () => void;
}) {
  const [more, setMore] = useState(false);
  if (!row) return null;
  const since =
    row.meta?.price_at_add != null && row.meta.price_at_add > 0 && row.ltp != null
      ? ((row.ltp - row.meta.price_at_add) / row.meta.price_at_add) * 100
      : null;

  return (
    <Sheet
      open={open}
      onClose={() => {
        setMore(false);
        onClose();
      }}
      size="lg"
      title={row.name}
      footer={
        <div className="pfs-acts">
          <Button type="button" variant="primary" onClick={onOwn}>
            <T en="I own it" bn="এটি আমার আছে" />
          </Button>
          <Button href={`/stock/${row.code}`} variant="quiet">
            <T en={`Open the ${row.code} page`} bn={`${row.code}-এর পেজ খুলুন`} />
          </Button>
        </div>
      }
    >
      <div className="pfs">
        <div className="pfs-money">
          <div className="min-w-0">
            <p className="pfs-sub">
              <b>{row.code}</b> · <T en="You watch it" bn="নজরে রাখছেন" />
            </p>
            {row.tier && <TierPill tier={row.tier} />}
          </div>
          <div className="pfs-val">
            <b>{money(row.ltp)}</b>
            <span className={changeTone(row.change)}>
              {changePct(row.change)} <T en="today" bn="আজ" />
            </span>
          </div>
        </div>

        {since != null && row.meta && (
          <dl className="pfs-kv">
            <div>
              <dt>
                <T
                  en={`Since you started watching, ${formatDate(row.meta.added_at)}`}
                  bn={`নজর রাখা শুরুর পর, ${bnDate(row.meta.added_at.slice(0, 10))}`}
                />
              </dt>
              <dd className={changeTone(since)}>
                {changePct(since, 1)} <span>({money(row.meta.price_at_add)})</span>
              </dd>
            </div>
          </dl>
        )}

        {updates.length > 0 ? (
          <div>
            <p className="pfs-k">
              <T en="Lately on this share" bn="সম্প্রতি এই শেয়ারে" />
            </p>
            <ul className="nt-list pfs-feed">
              {updates.slice(0, 4).map((i) => (
                <FeedRow key={i.id} href={i.url} {...itemRowProps(i, "day")} />
              ))}
            </ul>
            {updates.length > 4 && (
              <Link href="/notifications" className="pfs-feed-all">
                <T en={`All ${updates.length} in Updates`} bn={`আপডেটে সব ${updates.length}টি`} />
                <IconChevronRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <p className="pfs-p">
            <T
              en="Nothing new on it lately. Results, dividends and warnings show here the day they come."
              bn="সম্প্রতি নতুন কিছু নেই। আর্থিক ফল, ডিভিডেন্ড আর সতর্কতা এলে সেদিনই এখানে দেখাবে।"
            />
          </p>
        )}

        <div className="pfs-links">
          <Button type="button" variant="link" size="sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>
            <T en="What we tell you, stop watching" bn="কী জানাব, নজর বন্ধ" />
            <span className={more ? "pfs-chev pfs-chev--open" : "pfs-chev"}>
              <IconChevronDown size={14} />
            </span>
          </Button>
        </div>
        {more && (
          <div className="pfs-more">
            <WatchButton code={row.code} name={row.name} ltp={row.ltp} />
            <Button type="button" variant="danger" size="sm" onClick={onStop}>
              <T en="Stop watching" bn="নজর রাখা বন্ধ করুন" />
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
