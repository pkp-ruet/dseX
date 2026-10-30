"use client";

import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/report/chip";
import { usePremium } from "@/lib/premium";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";

/** A closed chapter's one gold line: what the full report answers here,
 *  linking up to the page's one Premium card (`href`). Shared by the stock
 *  report (`#ch-premium`) and the portfolio report (`#pf-premium`). */
export default function Signpost({
  text,
  href,
  area,
  lock,
  foot = false,
}: {
  text: Bi;
  href: string;
  /** Analytics: the page (`stock`, `portfolio`). */
  area: string;
  /** Analytics: the lock label. */
  lock: string;
  /** The chapter card's footer (adds "Premium →"). */
  foot?: boolean;
}) {
  const { state } = usePremium();
  return (
    <a
      href={href}
      className="rq-sign"
      data-foot={foot ? "true" : undefined}
      onClick={() => trackEvent("premium_lock_tap", { area, lock, state, stakes: 0 })}
    >
      <span className="rq-sign-icon" aria-hidden="true"><IconCrown size={14} /></span>
      <span className="min-w-0 flex-1">{tx(text)}</span>
      {foot && <span className="rq-sign-go"><T en="Premium" bn="প্রিমিয়াম" /> →</span>}
    </a>
  );
}
