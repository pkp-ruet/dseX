"use client";

import type { ReactNode } from "react";
import { Locked } from "@/components/premium/AnswerLock";
import { OpenScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";

/**
 * A whole page part behind one door (the dividend calendar, 2026-11-04 — the
 * stock page's `ReportGate` and the portfolio's gate, for any page). A reader
 * who can't see it gets `promo`, the page's one Premium card; a Premium reader
 * keeps only its `anchor` id, so links to the card still land somewhere.
 *
 * The content is always in the HTML, rendered open (`OpenScope`) and hidden
 * under one `Locked` (the paywall JSON-LD's `.premium-locked`).
 */
export default function PageGate({
  promo,
  anchor,
  anchorClass = "",
  children,
}: {
  promo: ReactNode;
  anchor: string;
  anchorClass?: string;
  children: ReactNode;
}) {
  const open = usePremiumOpen();
  return (
    <>
      {open ? <span id={anchor} className={`block ${anchorClass}`.trim()} aria-hidden="true" /> : promo}
      <Locked>
        <OpenScope>{children}</OpenScope>
      </Locked>
    </>
  );
}
