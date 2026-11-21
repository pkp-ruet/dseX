"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { activeAlertFor, loadAlerts, subscribeAlerts, type PriceAlert } from "@/lib/price-alerts";
import PriceAlertModal from "@/components/stock/PriceAlertModal";
import Button from "@/components/ui/Button";
import { IconBell } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";

/** "Alert me" beside the report's buy-below price: opens the price-alert sheet
 *  with that target filled in (the same sheet as the hero's button).
 *  `label` replaces "Alert me"; `compact` = a square bell (the Buy List's
 *  "Close, not yet" rows). */
export default function BuyBelowAlert({
  code, target, ltp, w52High, w52Low, label, compact = false,
}: {
  code: string;
  target: number;
  ltp: number | null;
  w52High?: number | null;
  w52Low?: number | null;
  label?: ReactNode;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState<PriceAlert | null>(null);

  useEffect(() => {
    if (isLoggedIn()) loadAlerts().then(() => setAlert(activeAlertFor(code))).catch(() => {});
    return subscribeAlerts(() => setAlert(activeAlertFor(code)));
  }, [code]);

  const armedHere = alert != null && Math.abs(alert.target_price - target) < 0.05;
  const onClick = () => {
    if (!isLoggedIn()) {
      router.push(`/register?next=${encodeURIComponent(pathname || `/stock/${code}`)}`);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="quiet"
          size="md"
          iconOnly
          active={armedHere}
          aria-label={armedHere ? `Alert set for ${code}` : `Alert me when ${code} reaches this price`}
          onClick={onClick}
        >
          <IconBell size={16} />
        </Button>
      ) : (
        <Button type="button" variant="quiet" size="md" active={armedHere} onClick={onClick}>
          <IconBell size={16} />
          {armedHere ? <T en="Alert set" bn="অ্যালার্ট দেওয়া আছে" /> : label ?? <T en="Alert me" bn="অ্যালার্ট দিন" />}
        </Button>
      )}
      {open && (
        <PriceAlertModal
          code={code}
          ltp={ltp}
          w52High={w52High}
          w52Low={w52Low}
          existing={alert}
          preset={target}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
