"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { activeAlertCount, loadAlerts } from "@/lib/price-alerts";
import { FREE_LIMITS, limitFor, usePremium } from "@/lib/premium";
import { getCachedWatchlist, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";

type Row = { key: string; label: { en: string; bn: string }; used: number | null; limit: number | null; note?: { en: string; bn: string } };

/**
 * What the reader's plan allows and how much of it they use (2026-10-29, the
 * Free vs Premium plan, step 7): watchlist, armed price alerts, this month's
 * free full reports and TopStock AI — so a limit is seen before it is hit.
 * The limit toasts (`showLimitNotice`) open this card (`/profile#plan`).
 */
export default function PlanUsage() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [watch, setWatch] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setWatch(getCachedWatchlist().length);
    loadWatchlist().then(update).catch(() => undefined);
    const off = subscribeWatchlist(update);
    loadAlerts().then(() => setAlerts(activeAlertCount())).catch(() => undefined);
    return off;
  }, []);

  const keys = user?.report_keys;
  const rows: Row[] = [
    { key: "watchlist", label: { en: "Shares you follow", bn: "অনুসরণ করা শেয়ার" }, used: watch, limit: limitFor(user, "watchlist") },
    { key: "alerts", label: { en: "Price alerts on", bn: "চালু প্রাইস অ্যালার্ট" }, used: alerts, limit: limitFor(user, "alerts") },
    ...(!isPremium
      ? [{
          key: "reports",
          label: { en: "Free full reports this month", bn: "এ মাসের ফ্রি পূর্ণ রিপোর্ট" },
          used: keys?.used ?? 0,
          limit: keys?.per_month ?? 3,
          note: { en: "Each opens one share's whole report for 7 days.", bn: "প্রতিটিতে একটি শেয়ারের পুরো রিপোর্ট 7 দিনের জন্য খোলে।" },
        }]
      : []),
    {
      key: "ai",
      label: { en: "TopStock AI questions a day", bn: "দিনে TopStock AI প্রশ্ন" },
      used: null,
      limit: limitFor(user, "ai_daily") ?? (isPremium ? null : FREE_LIMITS.ai_daily),
    },
  ];

  return (
    <ul className="plan-usage" aria-label="Plan usage">
      {rows.map((r) => {
        const full = r.limit != null && r.used != null && r.used >= r.limit;
        const pct = r.limit != null && r.used != null ? Math.min(100, (r.used / Math.max(1, r.limit)) * 100) : null;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-text-main"><T en={r.label.en} bn={r.label.bn} /></span>
              <span className={`text-sm font-semibold tabular-nums ${full ? "text-watch" : "text-text-main"}`}>
                {r.limit == null ? (
                  <T en={r.used != null ? `${r.used} · no limit` : "No limit"} bn={r.used != null ? `${r.used} · কোনো সীমা নেই` : "কোনো সীমা নেই"} />
                ) : r.used == null ? (
                  <T en={`${r.limit}`} bn={`${r.limit}টি`} />
                ) : (
                  <T en={`${r.used} of ${r.limit}`} bn={`${r.limit}টির ${r.used}টি`} />
                )}
              </span>
            </div>
            {pct != null && (
              <span className="plan-usage-track" aria-hidden="true">
                <span className={`plan-usage-fill ${full ? "is-full" : ""}`} style={{ width: `${Math.max(pct, 3)}%` }} />
              </span>
            )}
            {r.note && <p className="mt-1 text-xs text-text-muted"><T en={r.note.en} bn={r.note.bn} /></p>}
          </li>
        );
      })}
    </ul>
  );
}
