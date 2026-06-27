"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
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
  w52High?: number | null;
  w52Low?: number | null;
  className?: string;
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export default function PriceAlertButton({ code, ltp, w52High, w52Low, className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      loadAlerts().then(() => setAlert(activeAlertFor(code)));
    }
    return subscribeAlerts(() => setAlert(activeAlertFor(code)));
  }, [code]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      const next = encodeURIComponent(pathname || `/stock/${code}`);
      router.push(`/register?next=${next}`);
      return;
    }
    setOpen(true);
  }

  const armed = alert !== null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={armed ? `Edit price alert for ${code}` : `Set a price alert for ${code}`}
        title={armed ? "Edit price alert" : isLoggedIn() ? "Set a price alert" : "Sign in to set alerts"}
        className={`add-alert-btn ${armed ? "add-alert-btn--on" : ""} ${className}`}
        style={{ visibility: mounted ? "visible" : "hidden" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={armed ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>{armed ? `Alert ৳${fmt(alert!.target_price)}` : "Alert"}</span>
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
