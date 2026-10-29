"use client";

import { useRef, useState, type ReactNode } from "react";
import { T } from "@/components/i18n/T";
import type { Pair } from "@/components/dividend-calendar/dates";

/**
 * The first `initial` items of a calendar list, then one "Show N more" row.
 * Unlike the market page's ShowMore the rest stays in the HTML (`hidden`), so
 * search engines still read every date. `as="ul"` for a list of `<li>` rows,
 * `div` for date groups. Closing it again brings the list's top back on screen.
 */
export default function CalendarFold({
  items,
  initial,
  more,
  as = "div",
  className = "",
}: {
  items: ReactNode[];
  initial: number;
  /** The button while closed, e.g. "Show 12 more dates". */
  more: Pair;
  as?: "div" | "ul";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const start = useRef<HTMLSpanElement>(null);
  const Wrap = as;
  // One hidden item isn't worth a tap.
  const cut = items.length - initial <= 1 ? items.length : initial;
  const rest = items.slice(cut);

  const toggle = () => {
    if (open) {
      const el = start.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "center" });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <span ref={start} aria-hidden="true" />
      <Wrap className={className}>{items.slice(0, cut)}</Wrap>
      {rest.length > 0 && (
        <>
          <Wrap className={`${className} dc-fold-rest`.trim()} hidden={!open}>
            {rest}
          </Wrap>
          <button type="button" className="dc-more" onClick={toggle} aria-expanded={open}>
            {open ? <T en="Show fewer" bn="কম দেখান" /> : <T en={more.en} bn={more.bn} />}
          </button>
        </>
      )}
    </>
  );
}
