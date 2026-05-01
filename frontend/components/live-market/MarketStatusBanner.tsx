"use client";
import { useEffect, useState } from "react";
import { isMarketOpen, isTradingDay, secondsToClose, secondsToOpen, formatCountdown } from "@/lib/market-hours";

interface Props {
  serverTimeoutSeconds?: number | null;
}

export default function MarketStatusBanner({ serverTimeoutSeconds }: Props) {
  const [open, setOpen] = useState(false);
  const [tradingDay, setTradingDay] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function tick() {
      const o = isMarketOpen();
      const td = isTradingDay();
      setOpen(o);
      setTradingDay(td);
      const secs = o ? secondsToClose() : secondsToOpen();
      setCountdown(formatCountdown(secs));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] mb-6 h-[60px]" />;

  return (
    <div
      className={`rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3 mb-6 ${
        open
          ? "bg-[var(--green-bg,#f0fdf4)] border-[var(--green,#16a34a)] dark:bg-[#052e16] dark:border-[#16a34a]"
          : "bg-[var(--bg-secondary)] border-[var(--border)]"
      }`}
    >
      <div className="flex items-center gap-3">
        {open ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="font-semibold text-green-700 dark:text-green-400 text-sm">MARKET OPEN</span>
            <span className="text-[var(--text-muted)] text-sm">· Closes in {countdown}</span>
          </>
        ) : (
          <>
            <span className="relative flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--text-muted)]" />
            </span>
            <span className="font-semibold text-[var(--text-muted)] text-sm">MARKET CLOSED</span>
            {tradingDay ? (
              <span className="text-[var(--text-muted)] text-sm">· Opens today in {countdown}</span>
            ) : (
              <span className="text-[var(--text-muted)] text-sm">· Opens in {countdown}</span>
            )}
          </>
        )}
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Trading hours: Sun–Thu 10:00–14:30 BST
      </div>
    </div>
  );
}
