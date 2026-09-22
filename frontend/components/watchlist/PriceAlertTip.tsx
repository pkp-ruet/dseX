"use client";

import { useEffect, useState } from "react";
import { loadAlerts, getCachedAlerts } from "@/lib/price-alerts";
import Button from "@/components/ui/Button";

const FLAG = "dsex.alerts.tip";

/**
 * One-time nudge introducing price alerts to existing users. Self-hides once
 * dismissed (localStorage `dsex.alerts.tip`) or once the user already has an
 * armed alert (they've clearly discovered the feature).
 */
export default function PriceAlertTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FLAG) === "1") return;
    loadAlerts().then(() => {
      const hasArmed = getCachedAlerts().some((a) => a.is_active);
      if (!hasArmed) setVisible(true);
    });
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(FLAG, "1");
    } catch {
      // non-fatal
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-watch/30 bg-watch/10 p-4">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-watch/15 text-watch"
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text-main">New: price alerts</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Tap the <b>Alert</b> button on any stock to set a target price. We&apos;ll watch it and
          ping you the day it&apos;s hit.
        </p>
      </div>
      <Button type="button" variant="link" size="sm" onClick={dismiss} className="shrink-0">
        Got it
      </Button>
    </div>
  );
}
