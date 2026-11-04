"use client";

import { useEffect, useState, type ReactNode } from "react";
import { T } from "@/components/i18n/T";
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
// Links into the report that have a free twin in the data room.
const FREE_TWIN: Record<string, string> = { results: "latest-results", "rp-this_year": "latest-results" };

/**
 * A link from a free page (/results, the watchlist, the dashboard stories)
 * into a part of the report the reader can't open landed at the top of the
 * page with nothing about it (2026-11-04, audit SP1). Results go to their free
 * facts in the data room; anything else scrolls to the Premium card with one
 * line saying where that part is.
 */
function useLockedHash(enabled: boolean): boolean {
  const [missed, setMissed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id || id === "ch-premium") return;
      const el = document.getElementById(id);
      if (!el || !el.closest(".premium-locked") || el.offsetParent !== null) return;
      const twin = FREE_TWIN[id];
      if (twin && document.getElementById(twin)) {
        window.history.replaceState(null, "", `#${twin}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        return;
      }
      setMissed(true);
      requestAnimationFrame(() => document.getElementById("ch-premium")?.scrollIntoView({ block: "start" }));
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [enabled]);
  return missed;
}

export default function ReportGate({ promo = null, children }: { promo?: ReactNode; children: ReactNode }) {
  const open = usePremiumOpen();
  const missed = useLockedHash(!open && promo != null);
  return (
    <>
      {!open && promo && missed && (
        <p className="mb-3 rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-main" role="status">
          <T
            en="The part of the report that link points to is in the full report, below."
            bn="লিংকটি রিপোর্টের যে অংশের, তা নিচের পুরো রিপোর্টে আছে।"
          />
        </p>
      )}
      {/* Old `#ch-premium` links still land somewhere once the report is open. */}
      {open ? promo && <span id="ch-premium" className="stock-anchor block" aria-hidden="true" /> : promo}
      <Locked>
        <OpenScope>{children}</OpenScope>
      </Locked>
    </>
  );
}
