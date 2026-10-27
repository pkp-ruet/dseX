"use client";

import { useState, type ReactNode } from "react";
import { T } from "@/components/i18n/T";

/**
 * Shows the first `initial` rows of a list with a "See all N" button for the
 * rest — the same pattern the dashboard's IdeasCard uses. Keeps the page to a
 * phone-sized number of rows: four opportunity lists × six rows plus the
 * turning-point and dividend lists was ~50 tappable rows before the fold.
 *
 * `rows` are ready-made elements (server-rendered MarketRows are fine) — each
 * must carry its own `key`.
 */
export default function ShowMore({
  rows,
  initial = 3,
  noun = "shares",
  nounBn = "শেয়ার",
  className = "ms-srow-list",
}: {
  rows: ReactNode[];
  initial?: number;
  noun?: string;
  nounBn?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hidden = rows.length - initial;
  const shown = open || hidden <= 0 ? rows : rows.slice(0, initial);
  return (
    <>
      <div className={className}>{shown}</div>
      {hidden > 0 && (
        <button
          type="button"
          className="btn-quiet btn-sm btn-block mk-more"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? (
            <T en="Show fewer" bn="কম দেখান" />
          ) : (
            <T en={`See all ${rows.length} ${noun}`} bn={`সব ${rows.length}টি ${nounBn} দেখুন`} />
          )}
        </button>
      )}
    </>
  );
}
