"use client";

import { useEffect, useState } from "react";
import { loadAlerts, getCachedAlerts } from "@/lib/price-alerts";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";

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
    <div className="soft-card wl-note">
      <svg className="wl-note-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <div className="wl-note-body">
        <p className="wl-note-title">
          <T en="Know when a price is reached" bn="দাম পৌঁছালেই জেনে নিন" />
        </p>
        <p className="wl-note-text text-text-muted">
          <T
            en={
              <>
                Open any share in your list and tap <b className="text-text-main">Alert</b> to set a target price. We
                will watch it and tell you on the day it is reached.
              </>
            }
            bn={
              <>
                তালিকার যেকোনো শেয়ার খুলে <b className="text-text-main">অ্যালার্ট</b> চেপে একটি দাম ঠিক করুন। শেয়ারটি
                সেই দামে পৌঁছালে আমরা আপনাকে জানাব।
              </>
            }
          />
        </p>
      </div>
      <Button type="button" variant="link" size="sm" onClick={dismiss} className="shrink-0">
        <T en="Got it" bn="বুঝেছি" />
      </Button>
    </div>
  );
}
