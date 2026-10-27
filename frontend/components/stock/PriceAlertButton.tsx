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
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

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
  const { bn } = useLang();

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
      <Button
        type="button"
        variant="quiet"
        size="sm"
        active={armed}
        onClick={handleClick}
        aria-label={
          bn
            ? armed
              ? `${code}-এর প্রাইস অ্যালার্ট বদলান`
              : `${code}-এর জন্য প্রাইস অ্যালার্ট দিন`
            : armed
              ? `Change the price alert for ${code}`
              : `Set a price alert for ${code}`
        }
        title={
          mounted
            ? armed
              ? bn
                ? "প্রাইস অ্যালার্ট বদলান"
                : "Change your price alert"
              : isLoggedIn()
                ? bn
                  ? "প্রাইস অ্যালার্ট দিন"
                  : "Set a price alert"
                : bn
                  ? "অ্যালার্ট দিতে সাইন ইন করুন"
                  : "Sign in to set alerts"
            : undefined
        }
        className={`${mounted ? "" : "invisible"} ${className}`.trim()}
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
        <span className="tabular-nums">
          {armed ? (
            <T en={`Alert at ৳${fmt(alert!.target_price)}`} bn={`অ্যালার্ট ৳${fmt(alert!.target_price)}`} />
          ) : (
            <T en="Price alert" bn="প্রাইস অ্যালার্ট" />
          )}
        </span>
      </Button>

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
