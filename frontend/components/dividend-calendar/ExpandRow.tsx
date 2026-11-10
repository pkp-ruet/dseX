"use client";

import Link from "@/components/ui/Link";
import { useId, useState, type ReactNode } from "react";
import { IconChevronDown } from "@/components/ui/icons";

/**
 * One calendar row that opens in place (2026-11-04 clean pass, user: the page
 * "look messy and hard to understand"). The row itself is two lines — the
 * company, its ticker and one word, the cash on the right — and a tap opens
 * `body`: the explanations, the extra facts and the actions. The body stays
 * in the HTML (`hidden`). With no `body` the row is a plain link to `href`.
 */
export default function ExpandRow({
  head,
  fig,
  body,
  href,
}: {
  head: ReactNode;
  fig: ReactNode;
  body: ReactNode | null;
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!body) {
    return (
      <Link href={href} prefetch={false} className="dc-row">
        <span className="min-w-0">{head}</span>
        <span className="dc-fig">{fig}</span>
      </Link>
    );
  }

  return (
    <div className="dc-x" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="dc-row dc-row--x"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0">{head}</span>
        <span className="dc-fig">{fig}</span>
        <span className="dc-x-chev" aria-hidden="true">
          <IconChevronDown size={18} />
        </span>
      </button>
      <div id={id} className="dc-x-body" hidden={!open}>
        {body}
      </div>
    </div>
  );
}
