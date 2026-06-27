"use client";

import { useEffect, useState } from "react";
import {
  loadAlerts,
  subscribeAlerts,
  activeAlertFor,
  type PriceAlert,
} from "@/lib/price-alerts";
import PriceAlertModal from "@/components/stock/PriceAlertModal";

interface Props {
  code: string;
  ltp: number | null;
  w52High: number | null;
  w52Low: number | null;
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** Compact bell action for a watchlist row — opens the shared price-alert modal. */
export default function WatchlistAlertCell({ code, ltp, w52High, w52Low }: Props) {
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadAlerts().then(() => setAlert(activeAlertFor(code)));
    return subscribeAlerts(() => setAlert(activeAlertFor(code)));
  }, [code]);

  const armed = alert !== null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={armed ? `Edit price alert for ${code}` : `Set price alert for ${code}`}
        title={armed ? `Alert at ৳${fmt(alert!.target_price)}` : "Set price alert"}
        className={`wl-alert-btn${armed ? " wl-alert-btn--on" : ""}`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={armed ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>{armed ? `৳${fmt(alert!.target_price)}` : "Set"}</span>
      </button>

      {open && (
        <PriceAlertModal
          code={code}
          ltp={ltp}
          w52High={w52High}
          w52Low={w52Low}
          existing={alert}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
