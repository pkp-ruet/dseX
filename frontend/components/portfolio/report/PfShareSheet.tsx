"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import { tx } from "@/components/report/chip";
import { IconChevronDown, IconChevronRight, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { money, taka, takaGroup } from "@/lib/formatters";
import type { NotificationItem } from "@/lib/api";
import type { TierKey } from "@/lib/constants";
import type { PfStatus, PfWayItem } from "@/lib/portfolio-report";
import WatchButton from "@/components/watch-rules/WatchButton";
import FeedRow, { itemRowProps } from "@/components/feed/FeedRow";
import Link from "@/components/ui/Link";

export interface ShareSheetRow {
  code: string;
  name: string;
  qty: number;
  buyPrice: number;
  ltp: number | null;
  costBasis: number;
  value: number | null;
  pnl: number | null;
  pnlPct: number | null;
  w52High: number | null;
  w52Low: number | null;
  tier: TierKey | null;
}

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${takaGroup(Math.abs(v))}`;

/**
 * One share's whole story (2026-11-23, the simple portfolio page — plan
 * https://claude.ai/artifact/Gmoy9sYiEcvK4wZL5eqTXN): a tap on a share opens
 * this sheet instead of a drawer in the list. In order: the money, our take
 * (Premium: the share's status and why), getting back what you paid
 * (Premium, a share more than 5% below it — the old "Your way back" item),
 * what happened on it lately, the facts, then Bought more / Sold and "More"
 * (alert, watch rules, edit, remove). Everything that used to sit in five
 * places on the page for one share now sits here.
 *
 * Since 2026-11-25 ("one feed, told once") "Lately on this share" is the
 * Updates feed's own rows for this share (`FeedRow`, the reader's visible
 * ones), with a link to all of them; it opens on My shares (/my) and, for an
 * extra portfolio, on the portfolio page.
 */
export default function PfShareSheet({
  row,
  status,
  way,
  updates,
  open,
  premium,
  readOnly,
  onClose,
  onBuy,
  onSell,
  onEdit,
  onRemove,
  premiumHref = "#pf-premium",
}: {
  row: ShareSheetRow | null;
  status: PfStatus | null;
  way: PfWayItem | null;
  /** The feed rows on this share the reader may see, newest first. */
  updates: NotificationItem[];
  open: boolean;
  /** The reader sees our analysis (Premium, or the sample's open scope). */
  premium: boolean;
  readOnly: boolean;
  onClose: () => void;
  onBuy: () => void;
  onSell: () => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Where the "Our take is in Premium" line points (the portfolio's one Premium card). */
  premiumHref?: string;
}) {
  const [more, setMore] = useState(false);
  if (!row) return null;
  const pos =
    row.ltp != null && row.w52High != null && row.w52Low != null && row.w52High > row.w52Low
      ? Math.max(0, Math.min(1, (row.ltp - row.w52Low) / (row.w52High - row.w52Low)))
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
        !readOnly && (
          <div className="pfs-acts">
            <Button type="button" variant="primary" onClick={onBuy}>
              <T en="Bought more" bn="আরও কিনেছি" />
            </Button>
            <Button type="button" variant="quiet" onClick={onSell}>
              <T en="Sold" bn="বিক্রি করেছি" />
            </Button>
          </div>
        )
      }
    >
      <div className="pfs">
        {/* The money */}
        <div className="pfs-money">
          <div className="min-w-0">
            <p className="pfs-sub">
              <b>{row.code}</b> · <T en={`${row.qty.toLocaleString("en-IN")} share${row.qty === 1 ? "" : "s"}`} bn={`${row.qty.toLocaleString("en-IN")}টি শেয়ার`} />
            </p>
            {row.tier && <TierPill tier={row.tier} />}
          </div>
          <div className="pfs-val">
            <b className="pv">{row.value != null ? takaGroup(row.value) : "—"}</b>
            {row.pnl != null && (
              <span className={`pv ${row.pnl > 0 ? "pf-up" : row.pnl < 0 ? "pf-down" : "pf-flat"}`}>
                {signed(row.pnl)}
                {row.pnlPct != null ? ` (${row.pnlPct > 0 ? "+" : row.pnlPct < 0 ? "−" : ""}${Math.abs(row.pnlPct).toFixed(1)}%)` : ""}{" "}
                <T en="since you bought" bn="কেনার পর থেকে" />
              </span>
            )}
          </div>
        </div>

        {/* Our take */}
        {premium && status ? (
          <div className="pfs-take" data-tone={status.tone}>
            <p className="pfs-k">
              <T en="Our take" bn="আমাদের মত" />
            </p>
            <p className="pfs-take-w">{tx(status.word)}</p>
            {status.why && <p className="pfs-take-why">{tx(status.why)}</p>}
          </div>
        ) : !premium ? (
          <a href={premiumHref} className="pfs-lock" onClick={onClose}>
            <IconCrown size={14} />
            <span>
              <T en="Our take on this share, and what to do with it, is in Premium." bn="এই শেয়ার নিয়ে আমাদের মত আর কী করবেন, তা প্রিমিয়ামে।" />
            </span>
            <IconChevronRight size={14} />
          </a>
        ) : null}

        {/* Getting back what you paid */}
        {premium && way && (
          <div className="pfs-box">
            <p className="pfs-k">
              <T en="Getting back what you paid" bn="কেনা দামে ফেরা" />
            </p>
            <p className="pfs-p">{tx(way.why)}</p>
            <dl className="pfs-kv pv">
              <div>
                <dt><T en="Price that gets your money back" bn="যে দামে টাকা ফিরবে" /></dt>
                <dd>
                  {money(way.even)} <span>(+{Math.max(0, Math.round(way.rise))}%)</span>
                </dd>
              </div>
              {way.reached != null && (
                <div>
                  <dt><T en="Did it trade there this past year?" bn="গত এক বছরে কি ওই দামে লেনদেন হয়েছে?" /></dt>
                  <dd>{way.reached ? <T en="Yes" bn="হ্যাঁ" /> : <T en="No" bn="না" />}</dd>
                </div>
              )}
              <div>
                <dt><T en="Cash it pays you a year, after tax" bn="বছরে নগদ ডিভিডেন্ড, করের পর" /></dt>
                <dd>{way.cash >= 1 ? takaGroup(way.cash) : <T en="Nothing" bn="কিছুই না" />}</dd>
              </div>
            </dl>
            {way.more && <p className="pfs-p">{tx(way.more)}</p>}
            {way.move && (
              <p className="pfs-p">
                <b>
                  <T en="A stronger choice:" bn="আরও শক্তিশালী বিকল্প:" />
                </b>{" "}
                {tx(way.move.line)}
              </p>
            )}
          </div>
        )}

        {/* What happened lately: the feed's own rows */}
        {updates.length > 0 && (
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
        )}

        {/* The facts */}
        <dl className="pfs-kv pv">
          <div>
            <dt><T en="You paid, a share" bn="কেনার দাম, প্রতি শেয়ার" /></dt>
            <dd>{taka(row.buyPrice, 2)}</dd>
          </div>
          <div>
            <dt><T en="Price now" bn="এখনকার দাম" /></dt>
            <dd>{row.ltp != null ? taka(row.ltp, 2) : "—"}</dd>
          </div>
          <div>
            <dt><T en="Money you put in" bn="আপনার বিনিয়োগ" /></dt>
            <dd>{takaGroup(row.costBasis)}</dd>
          </div>
        </dl>
        {pos != null && (
          <div className="pfs-range">
            <p className="pfs-k">
              <T en="Where the price sits this year" bn="এ বছরে দাম কোথায়" />
            </p>
            <div className="pf-range" aria-hidden>
              <i style={{ left: `${(pos * 100).toFixed(1)}%` }} />
            </div>
            <div className="pf-range-ends">
              <span><T en="Low" bn="সর্বনিম্ন" /> {row.w52Low!.toFixed(1)}</span>
              <span><T en="High" bn="সর্বোচ্চ" /> {row.w52High!.toFixed(1)}</span>
            </div>
          </div>
        )}

        <div className="pfs-links">
          <Button href={`/stock/${row.code}`} variant="quiet" size="sm">
            <T en={`Open the ${row.code} page`} bn={`${row.code}-এর পেজ খুলুন`} />
            <IconChevronRight size={14} />
          </Button>
          {!readOnly && (
            <Button type="button" variant="link" size="sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>
              <T en="Watch, edit" bn="নজর, সম্পাদনা" />
              <span className={more ? "pfs-chev pfs-chev--open" : "pfs-chev"}>
                <IconChevronDown size={14} />
              </span>
            </Button>
          )}
        </div>
        {!readOnly && more && (
          <div className="pfs-more">
            <WatchButton code={row.code} name={row.name} ltp={row.ltp} />
            <Button type="button" variant="quiet" size="sm" onClick={onEdit}>
              <T en="Fix a mistake" bn="ভুল ঠিক করুন" />
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={onRemove}>
              <T en="Remove" bn="সরান" />
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
