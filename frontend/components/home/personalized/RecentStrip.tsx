"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { ScoreItem } from "@/lib/api";
import type { ReportKeys } from "@/lib/auth";
import { changePct, changeTone } from "@/lib/formatters";
import { readRecentStocks, RECENT_EVENT } from "@/lib/recent-stocks";
import { IconBook } from "@/components/ui/icons";

/** How many chips the strip shows. */
const SHOWN = 5;

/**
 * "Continue where you left off" (2026-11-17, the simple home): the last five
 * shares opened on this device (`lib/recent-stocks.ts`, written by the stock
 * page), each with today's move, one tap back to its page — like bKash's
 * recent contacts. A free reader also sees how many of the month's free
 * analyses are left, and a small book on the shares already read with one.
 * Nothing renders until the reader has opened a share on this device.
 */
export default function RecentStrip({
  lang,
  premium,
  priceMap,
  reportKeys,
}: {
  lang: Lang;
  premium: boolean;
  priceMap: Map<string, ScoreItem>;
  reportKeys?: ReportKeys | null;
}) {
  const bn = lang === "bn";
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setCodes(readRecentStocks().slice(0, SHOWN));
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("dsex.recentStocks")) sync();
    };
    window.addEventListener(RECENT_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENT_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (codes.length === 0) return null;

  const keys = !premium ? reportKeys ?? null : null;
  const read = new Set((keys?.read ?? []).map((c) => c.toUpperCase()));
  const note = keys
    ? keys.left > 0
      ? bn
        ? `এ মাসে ${keys.per_month}টির মধ্যে ${keys.left}টি ফ্রি বিশ্লেষণ বাকি`
        : `${keys.left} of ${keys.per_month} free analyses left this month`
      : bn
        ? `এ মাসের ${keys.per_month}টি ফ্রি বিশ্লেষণ পড়া শেষ`
        : `All ${keys.per_month} free analyses read this month`
    : null;

  return (
    <section className={`hm-recent ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="recent">
      <div className="hm-recent-head">
        <h2 className="hm-recent-h">{bn ? "যেখানে থেমেছিলেন" : "Continue where you left off"}</h2>
        {note && (
          <span className="hm-recent-note">
            <IconBook size={13} />
            {note}
          </span>
        )}
      </div>
      <ul className="hm-recent-list">
        {codes.map((code) => {
          const item = priceMap.get(code);
          const chg = item?.change_pct ?? null;
          const wasRead = read.has(code);
          return (
            <li key={code}>
              <Link
                href={`/stock/${encodeURIComponent(code)}`}
                className="hm-recent-chip"
                title={item?.company_name ?? code}
              >
                <b>{code}</b>
                {chg != null && <span className={`nums ${changeTone(chg)}`}>{changePct(chg, 1)}</span>}
                {wasRead && (
                  <span
                    className="hm-recent-read"
                    title={bn ? "এ মাসে পড়া ফ্রি বিশ্লেষণ" : "Free analysis read this month"}
                  >
                    <IconBook size={11} />
                    <span className="sr-only">{bn ? "এ মাসে পড়া ফ্রি বিশ্লেষণ" : "Free analysis read this month"}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
