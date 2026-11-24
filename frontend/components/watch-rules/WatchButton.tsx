"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { isLoggedIn } from "@/lib/auth";
import type { WatchRulesState } from "@/lib/api";
import { isWatched, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { activeAlertFor, loadAlerts, subscribeAlerts } from "@/lib/price-alerts";
import WatchRulesSheet from "@/components/watch-rules/WatchRulesSheet";
import { getWatchRulesState, loadWatchRules, subscribeWatchRules } from "@/components/watch-rules/store";

/**
 * THE Watch button (2026-11-25, one Watch button): replaces the stock page's
 * Watchlist, Price alert and "Watch this share" buttons. "Watch" until the
 * share is on the watchlist, then "Watching", with how many things we tell
 * the reader about it (rules + a price alert). A tap opens the Watch sheet;
 * signed-out readers go to sign up and come back.
 */
export default function WatchButton({
  code,
  name,
  ltp = null,
  size = "sm",
  className = "",
}: {
  code: string;
  name?: string | null;
  ltp?: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { bn } = useLang();
  const up = code.toUpperCase();
  const [mounted, setMounted] = useState(false);
  const [watched, setWatched] = useState(false);
  const [state, setState] = useState<WatchRulesState | null>(getWatchRulesState());
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) {
      loadWatchlist().then(() => setWatched(isWatched(up))).catch(() => {});
      loadWatchRules().then((s) => s && setState(s));
      loadAlerts().then(() => setArmed(!!activeAlertFor(up))).catch(() => {});
    }
    const offW = subscribeWatchlist(() => setWatched(isWatched(up)));
    const offR = subscribeWatchRules(() => setState(getWatchRulesState()));
    const offA = subscribeAlerts(() => setArmed(!!activeAlertFor(up)));
    return () => {
      offW();
      offR();
      offA();
    };
  }, [up]);

  const n = (state?.rules ?? []).filter((r) => r.code === up).length + (armed ? 1 : 0);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      router.push(`/register?save=${up}&next=${encodeURIComponent(pathname || `/stock/${up}`)}`);
      return;
    }
    loadWatchRules().then((s) => s && setState(s));
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="quiet"
        size={size}
        active={watched}
        onClick={onClick}
        className={`${mounted ? "" : "invisible"} ${className}`.trim()}
        aria-label={
          bn
            ? watched
              ? `${up}-এ নজর রাখছেন। কী জানাব বদলান`
              : `${up}-এ নজর রাখুন`
            : watched
              ? `You're watching ${up}. Change what we tell you`
              : `Watch ${up}`
        }
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" fill={watched ? "currentColor" : "none"} />
        </svg>
        <span>
          {!watched ? (
            <T en="Watch" bn="নজর রাখুন" />
          ) : n > 0 ? (
            <T en={`Watching · ${n}`} bn={`নজরে · ${n}`} />
          ) : (
            <T en="Watching" bn="নজরে আছে" />
          )}
        </span>
      </Button>
      {open && (
        <WatchRulesSheet code={up} name={name || up} state={state} open={open} ltp={ltp} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
