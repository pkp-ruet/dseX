"use client";

import type { ReactNode } from "react";
import { Locked } from "@/components/premium/AnswerLock";
import { OpenScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";

/**
 * Everything we say about a stock, behind one door (2026-11-01, user: "the
 * whole stock page is very complicated and messy for free users with lots of
 * premium cards … everything we say about the stock will be part of
 * premium"). A reader who can't see the full report gets `promo` — the
 * page's one Premium card (`#ch-premium`) — and nothing of the report; the
 * price, the chart and the data room stay free.
 *
 * The page has two gates: the answer card above the chart (no promo) and the
 * chapters below it (with the promo), so a Premium reader keeps the answer
 * first and a free reader gets price → chart → this card → the data room.
 *
 * The report itself is always in the HTML, rendered open (`OpenScope`) and
 * hidden under one `Locked` (the paywall JSON-LD's `.premium-locked`), so a
 * Premium reader, today's free report or a report key shows it in place.
 */
export default function ReportGate({ promo = null, children }: { promo?: ReactNode; children: ReactNode }) {
  const open = usePremiumOpen();
  return (
    <>
      {/* Old `#ch-premium` links still land somewhere once the report is open. */}
      {open ? promo && <span id="ch-premium" className="stock-anchor block" aria-hidden="true" /> : promo}
      <Locked>
        <OpenScope>{children}</OpenScope>
      </Locked>
    </>
  );
}
